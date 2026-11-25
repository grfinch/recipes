import { useEffect, useId, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import useTurnstile from '../../hooks/useTurnstile';
import {
  CHANGE_FIELDS,
  CHANGE_KINDS,
  EMPTY_CHANGE,
  changeKindLabel,
  cleanChange,
  validateChange,
} from '../../utils/recipeChange';
import { hashFor } from '../../utils/recipeHash';
import sendToRelay from '../../utils/sendToRelay';
import { ISSUES_URL } from '../../utils/suggestion';
import ErrorSummary from './ErrorSummary';
import Field from './Field';

import styles from './suggest.module.css';

// What a visitor has typed but not sent, per recipe, so leaving the page doesn't lose it
const draftKey = (recipeId) => `recipes:change-draft:${recipeId}`;

function loadDraft(recipeId) {
  try {
    const saved = JSON.parse(localStorage.getItem(draftKey(recipeId)));
    if (!saved || typeof saved !== 'object') return EMPTY_CHANGE;
    const known = CHANGE_FIELDS.filter(({ name }) => typeof saved[name] === 'string');
    return {
      ...EMPTY_CHANGE,
      ...Object.fromEntries(known.map(({ name }) => [name, saved[name]])),
    };
  } catch {
    return EMPTY_CHANGE; // corrupt or unavailable storage: start empty
  }
}

function saveDraft(recipeId, values) {
  try {
    if (values.details === '' && values.submitter === '') {
      localStorage.removeItem(draftKey(recipeId));
    } else {
      localStorage.setItem(draftKey(recipeId), JSON.stringify(values));
    }
  } catch {
    // Storage full or blocked: the form still works, just without a draft
  }
}

// Page for #/suggest-change?recipe=<id>: a visitor's fix, improvement or tip for one recipe,
// sent to the same relay as new recipes (it opens a GitHub issue labeled recipe-change). Without
// a relay (dev, tests, forks) the page links to a new GitHub issue instead.
export default function SuggestChange({
  recipe,
  endpoint = import.meta.env.VITE_SUGGEST_ENDPOINT,
  turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY,
}) {
  const [sent, setSent] = useState(false);
  const [formKey, setFormKey] = useState(0); // a new key gives a fresh form and spam check
  const headingRef = useRef(null);

  // The page's content changes without a hash change, so move focus to its new h1 here,
  // the way App does after navigating.
  function show(update) {
    flushSync(update);
    headingRef.current?.focus();
  }

  const backLink = (
    <p className={styles.back}>
      <a href={hashFor(recipe)}>
        <span aria-hidden="true">←&nbsp;</span>Back to {recipe.name}
      </a>
    </p>
  );

  if (!endpoint) {
    const issueUrl = `${ISSUES_URL}?${new URLSearchParams({ title: `Change to ${recipe.name}` })}`;
    return (
      <div className={styles.page}>
        {backLink}
        <h1 tabIndex={-1}>Suggest a change to {recipe.name}</h1>
        <p className={styles.intro}>
          Suggestions can&apos;t be sent from this copy of the cook book.
        </p>
        <p>
          If you have a GitHub account, you can <a href={issueUrl}>suggest a change on GitHub</a>{' '}
          instead.
        </p>
      </div>
    );
  }

  if (sent) {
    return (
      <div className={styles.page}>
        <h1 tabIndex={-1} ref={headingRef}>
          Thanks for the suggestion!
        </h1>
        <p className={styles.intro}>
          Twig reads every suggestion. If it makes {recipe.name} better, the recipe will be updated.
        </p>
        <div className={styles.actions}>
          <a href={hashFor(recipe)}>Back to {recipe.name}</a>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() =>
              show(() => {
                setSent(false);
                setFormKey((k) => k + 1);
              })
            }
          >
            Suggest another change
          </button>
        </div>
      </div>
    );
  }

  return (
    <ChangeForm
      key={formKey}
      recipe={recipe}
      endpoint={endpoint}
      turnstileSiteKey={turnstileSiteKey}
      headingRef={headingRef}
      backLink={backLink}
      onSent={() => show(() => setSent(true))}
    />
  );
}

function ChangeForm({ recipe, endpoint, turnstileSiteKey, headingRef, backLink, onSent }) {
  const [values, setValues] = useState(() => loadDraft(recipe.id));
  const [attempted, setAttempted] = useState(false); // errors show only after the first Send
  const [status, setStatus] = useState('editing'); // 'editing' | 'sending' | 'failed'
  const [copied, setCopied] = useState(false);
  const summaryRef = useRef(null);
  const honeypotRef = useRef(null);
  const {
    containerRef: checkRef,
    token: checkToken,
    failed: checkFailed,
    reset: resetCheck,
  } = useTurnstile(turnstileSiteKey);
  const idBase = useId();
  const idFor = (name) => `${idBase}-${name}`;

  useEffect(() => saveDraft(recipe.id, values), [recipe.id, values]);

  const payload = { ...values, recipeId: recipe.id };
  const fieldErrors = attempted ? validateChange(payload) : {};
  const needsCheck = Boolean(turnstileSiteKey) && !checkToken;
  const checkError =
    attempted && needsCheck
      ? checkFailed
        ? "The spam check couldn't load. Turn off content blockers for this page, or try again later."
        : 'Wait a moment for the spam check to finish, then send again.'
      : '';
  const problems = [
    ...CHANGE_FIELDS.filter(({ name }) => fieldErrors[name]).map(({ name }) => ({
      id: idFor(name),
      message: fieldErrors[name],
    })),
    ...(checkError ? [{ id: idFor('check'), message: checkError }] : []),
  ];
  const sending = status === 'sending';
  const canCopy = typeof navigator !== 'undefined' && Boolean(navigator.clipboard?.writeText);

  async function handleSubmit(event) {
    event.preventDefault();
    if (sending) return;
    if (Object.keys(validateChange(payload)).length > 0 || needsCheck) {
      flushSync(() => setAttempted(true));
      summaryRef.current?.focus();
      return;
    }

    setStatus('sending');
    setCopied(false);
    try {
      await sendToRelay(endpoint, {
        type: 'change',
        ...cleanChange(payload),
        website: honeypotRef.current?.value ?? '', // honeypot: people never see it
        turnstileToken: checkToken,
      });
      saveDraft(recipe.id, EMPTY_CHANGE);
      onSent();
    } catch {
      setStatus('failed');
      resetCheck(); // the token was used up
    }
  }

  async function copySuggestion() {
    try {
      await navigator.clipboard.writeText(
        `${recipe.name}\n${changeKindLabel(values.kind)}:\n${values.details.trim()}`,
      );
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const textProps = (name) => ({
    name,
    value: values[name],
    onChange: (e) => setValues({ ...values, [name]: e.target.value }),
  });

  return (
    <div className={styles.page}>
      {backLink}
      <h1 tabIndex={-1} ref={headingRef}>
        Suggest a change to {recipe.name}
      </h1>
      <p className={styles.intro}>
        Spotted a mistake, or found a way to make it better? Suggest a change.
      </p>

      <ErrorSummary problems={problems} summaryRef={summaryRef} noun="suggestion" />

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <Field id={idFor('kind')} label="What kind of change" error={fieldErrors.kind}>
          {(props) => (
            <select {...props} {...textProps('kind')}>
              {CHANGE_KINDS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field
          id={idFor('details')}
          label="Your suggestion"
          hint="Which ingredient or step, and what to change. Amounts, times, and temperatures help."
          error={fieldErrors.details}
        >
          {(props) => <textarea rows={8} required {...props} {...textProps('details')} />}
        </Field>

        <Field
          id={idFor('submitter')}
          label="Your name"
          optional
          hint="Shown publicly as credit. Leave it blank to stay anonymous."
          error={fieldErrors.submitter}
        >
          {(props) => (
            <input type="text" autoComplete="name" {...props} {...textProps('submitter')} />
          )}
        </Field>

        {/* Honeypot: hidden from people and screen readers; bots that fill it are ignored */}
        <div className={styles.honeypot}>
          <label htmlFor={idFor('website')}>Leave this empty</label>
          <input
            type="text"
            id={idFor('website')}
            ref={honeypotRef}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {turnstileSiteKey ? (
          <div id={idFor('check')} ref={checkRef} tabIndex={-1} className={styles.check} />
        ) : null}

        <p className={styles.privacy}>
          Your suggestion is posted publicly on GitHub, where Twig reviews it. Please don&apos;t
          include personal details like your email or address.
        </p>

        {status === 'failed' ? (
          <div role="alert" className={styles.alert}>
            <p>
              <strong>Your suggestion wasn&apos;t sent.</strong> Nothing you typed was lost. Check
              your connection and press Send again
              {canCopy ? ', or copy your suggestion to send it another way' : ''}.
            </p>
          </div>
        ) : null}

        <div className={styles.actions}>
          <button type="submit" className={styles.primaryButton} aria-disabled={sending}>
            {sending ? 'Sending…' : 'Send suggestion'}
          </button>
          {status === 'failed' && canCopy ? (
            <button type="button" className={styles.secondaryButton} onClick={copySuggestion}>
              Copy my suggestion
            </button>
          ) : null}
          <span aria-live="polite" className={styles.copied}>
            {copied ? 'Copied.' : ''}
          </span>
        </div>
      </form>
    </div>
  );
}
