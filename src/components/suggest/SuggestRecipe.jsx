import { useEffect, useId, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import categories from '../../recipeCategories.json';
import useTurnstile from '../../hooks/useTurnstile';
import { BROWSE_HASH } from '../../utils/recipeHash';
import sendToRelay from '../../utils/sendToRelay';
import {
  EMPTY_SUGGESTION,
  ISSUES_URL,
  FIELDS,
  cleanSuggestion,
  suggestionAsText,
  validateSuggestion,
} from '../../utils/suggestion';
import ErrorSummary from './ErrorSummary';
import Field from './Field';
import styles from './suggest.module.css';

// What a visitor has typed but not sent, so leaving the page (or a reload) doesn't lose it
const DRAFT_KEY = 'recipes:suggestion-draft';

function loadDraft() {
  try {
    const saved = JSON.parse(localStorage.getItem(DRAFT_KEY));
    if (!saved || typeof saved !== 'object') return EMPTY_SUGGESTION;
    const known = FIELDS.filter(({ name }) => typeof saved[name] === 'string');
    return {
      ...EMPTY_SUGGESTION,
      ...Object.fromEntries(known.map(({ name }) => [name, saved[name]])),
    };
  } catch {
    return EMPTY_SUGGESTION; // corrupt or unavailable storage: start empty
  }
}

function saveDraft(values) {
  try {
    if (Object.values(values).every((v) => v === '')) localStorage.removeItem(DRAFT_KEY);
    else localStorage.setItem(DRAFT_KEY, JSON.stringify(values));
  } catch {
    // Storage full or blocked (private browsing): the form still works, just without a draft
  }
}

// Page for #/suggest: the form, then a thank-you once it is sent. endpoint is the relay that
// opens a GitHub issue; without one (dev, tests, forks) the page says so and links to GitHub.
export default function SuggestRecipe({
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

  if (!endpoint) return <NotSetUp />;

  if (sent) {
    return (
      <div className={styles.page}>
        <h1 tabIndex={-1} ref={headingRef}>
          Thanks for the recipe!
        </h1>
        <p className={styles.intro}>
          Gaven reads every suggestion. If it&apos;s a good fit, it&apos;ll show up in the cook book
          after a little tidying.
        </p>
        <div className={styles.actions}>
          <a href={BROWSE_HASH}>Browse all recipes</a>
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
            Suggest another recipe
          </button>
        </div>
      </div>
    );
  }

  return (
    <SuggestForm
      key={formKey}
      endpoint={endpoint}
      turnstileSiteKey={turnstileSiteKey}
      headingRef={headingRef}
      onSent={() => show(() => setSent(true))}
      onClear={() =>
        show(() => {
          saveDraft(EMPTY_SUGGESTION);
          setFormKey((k) => k + 1);
        })
      }
    />
  );
}

function NotSetUp() {
  return (
    <div className={styles.page}>
      <h1 tabIndex={-1}>Suggest a recipe</h1>
      <p className={styles.intro}>
        Suggestions can&apos;t be sent from this copy of the cook book.
      </p>
      <p>
        If you have a GitHub account, you can <a href={ISSUES_URL}>suggest a recipe on GitHub</a>{' '}
        instead.
      </p>
    </div>
  );
}

function SuggestForm({ endpoint, turnstileSiteKey, headingRef, onSent, onClear }) {
  const [values, setValues] = useState(loadDraft);
  const [attempted, setAttempted] = useState(false); // errors show only after the first Send
  const [status, setStatus] = useState('editing'); // 'editing' | 'sending' | 'failed'
  const [copied, setCopied] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const summaryRef = useRef(null);
  const clearRef = useRef(null);
  const confirmClearRef = useRef(null);
  const honeypotRef = useRef(null);
  const {
    containerRef: checkRef,
    token: checkToken,
    failed: checkFailed,
    reset: resetCheck,
  } = useTurnstile(turnstileSiteKey);
  const idBase = useId();
  const idFor = (name) => `${idBase}-${name}`;

  useEffect(() => saveDraft(values), [values]);

  // Recomputed as the visitor types, so a fixed field's error goes away
  const fieldErrors = attempted ? validateSuggestion(values) : {};
  const needsCheck = Boolean(turnstileSiteKey) && !checkToken;
  const checkError =
    attempted && needsCheck
      ? checkFailed
        ? "The spam check couldn't load. Turn off content blockers for this page, or try again later."
        : 'Wait a moment for the spam check to finish, then send again.'
      : '';
  const problems = [
    ...FIELDS.filter(({ name }) => fieldErrors[name]).map(({ name }) => ({
      id: idFor(name),
      message: fieldErrors[name],
    })),
    ...(checkError ? [{ id: idFor('check'), message: checkError }] : []),
  ];
  const sending = status === 'sending';
  const hasText = Object.values(values).some((v) => v.trim() !== '');
  const canCopy = typeof navigator !== 'undefined' && Boolean(navigator.clipboard?.writeText);

  function update(name, value) {
    setValues({ ...values, [name]: value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (sending) return;
    if (Object.keys(validateSuggestion(values)).length > 0 || needsCheck) {
      flushSync(() => setAttempted(true));
      summaryRef.current?.focus();
      return;
    }

    setStatus('sending');
    setCopied(false);
    try {
      await sendToRelay(endpoint, {
        ...cleanSuggestion(values),
        website: honeypotRef.current?.value ?? '', // honeypot: people never see it
        turnstileToken: checkToken,
      });
      saveDraft(EMPTY_SUGGESTION);
      onSent();
    } catch {
      setStatus('failed');
      resetCheck(); // the token was used up
    }
  }

  // Clearing asks first, in place: the question takes the Clear button's spot and gets focus.
  // "Keep it" puts focus back on Clear form. Clearing itself (onClear) starts a fresh form,
  // draft and spam check, and focuses the h1.
  function askToClear() {
    flushSync(() => setConfirmingClear(true));
    confirmClearRef.current?.focus();
  }

  function keepText() {
    flushSync(() => setConfirmingClear(false));
    clearRef.current?.focus();
  }

  async function copyRecipe() {
    try {
      await navigator.clipboard.writeText(suggestionAsText(values));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const textProps = (name) => ({
    name,
    value: values[name],
    onChange: (e) => update(name, e.target.value),
  });

  return (
    <div className={styles.page}>
      <h1 tabIndex={-1} ref={headingRef}>
        Suggest a recipe
      </h1>
      <p className={styles.intro}>
        Have a recipe we should try? Send it over. Rough notes are fine; we&apos;ll tidy it up.
      </p>

      <ErrorSummary problems={problems} summaryRef={summaryRef} noun="suggestion" />

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <Field id={idFor('name')} label="Recipe name" error={fieldErrors.name}>
          {(props) => (
            <input type="text" required autoComplete="off" {...props} {...textProps('name')} />
          )}
        </Field>

        <Field
          id={idFor('ingredients')}
          label="Ingredients"
          hint="One per line, with amounts if you know them."
          error={fieldErrors.ingredients}
        >
          {(props) => <textarea rows={8} required {...props} {...textProps('ingredients')} />}
        </Field>

        <Field
          id={idFor('steps')}
          label="Steps"
          hint="In order. Times and temperatures help."
          error={fieldErrors.steps}
        >
          {(props) => <textarea rows={10} required {...props} {...textProps('steps')} />}
        </Field>

        <div className={styles.pair}>
          <Field
            id={idFor('course')}
            label="Course"
            optional
            hint="Not sure? Leave it, and we'll pick one."
            error={fieldErrors.course}
          >
            {(props) => (
              <select {...props} {...textProps('course')}>
                <option value="">Not sure</option>
                {categories.courses.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            )}
          </Field>
          <Field
            id={idFor('cookingMethod')}
            label="Cooking method"
            optional
            hint="Not sure? Leave it, and we'll pick one."
            error={fieldErrors.cookingMethod}
          >
            {(props) => (
              <select {...props} {...textProps('cookingMethod')}>
                <option value="">Not sure</option>
                {categories.cookingMethods.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            )}
          </Field>
        </div>

        <Field
          id={idFor('notes')}
          label="Tips, swaps, or servings"
          optional
          hint="Substitutions, storage, how many it serves."
          error={fieldErrors.notes}
        >
          {(props) => <textarea rows={4} {...props} {...textProps('notes')} />}
        </Field>

        <Field
          id={idFor('source')}
          label="Where it's from"
          optional
          hint="A link, a cookbook, or a person, like “Grandma”."
          error={fieldErrors.source}
        >
          {(props) => <input type="text" {...props} {...textProps('source')} />}
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
          Your suggestion is posted publicly on GitHub, where Gaven reviews it. Please don&apos;t
          include personal details like your email or address.
        </p>

        {status === 'failed' ? (
          <div role="alert" className={styles.alert}>
            <p>
              <strong>Your recipe wasn&apos;t sent.</strong> Nothing you typed was lost. Check your
              connection and press Send again
              {canCopy ? ', or copy your recipe to send it another way' : ''}.
            </p>
          </div>
        ) : null}

        <div className={styles.actions}>
          <button type="submit" className={styles.primaryButton} aria-disabled={sending}>
            {sending ? 'Sending…' : 'Send suggestion'}
          </button>
          {status === 'failed' && canCopy ? (
            <button type="button" className={styles.secondaryButton} onClick={copyRecipe}>
              Copy my recipe
            </button>
          ) : null}
          <span aria-live="polite" className={styles.copied}>
            {copied ? 'Copied.' : ''}
          </span>
        </div>

        {hasText && !sending ? (
          confirmingClear ? (
            <div
              role="group"
              aria-labelledby={idFor('clear-question')}
              className={styles.clearConfirm}
            >
              <p id={idFor('clear-question')} className={styles.clearQuestion}>
                Clear everything you&apos;ve typed? This can&apos;t be undone.
              </p>
              <div className={styles.actions}>
                <button
                  type="button"
                  ref={confirmClearRef}
                  className={styles.secondaryButton}
                  onClick={onClear}
                >
                  Yes, clear the form
                </button>
                <button type="button" className={styles.secondaryButton} onClick={keepText}>
                  Keep it
                </button>
              </div>
            </div>
          ) : (
            <div>
              <button
                type="button"
                ref={clearRef}
                className={styles.secondaryButton}
                onClick={askToClear}
              >
                Clear form
              </button>
            </div>
          )
        ) : null}
      </form>
    </div>
  );
}
