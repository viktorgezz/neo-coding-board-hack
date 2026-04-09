/**
 * InterviewDonePage — /session/:id/done
 *
 * Terminal screen of the candidate's journey. Rendered after the polling loop
 * in CandidateEditorPage detects status FINISHED and redirects here.
 *
 * Zero hooks. Zero API calls. Zero auth. Zero dynamic behavior.
 * The candidate reads two lines of text and closes the tab.
 *
 * If anyone adds a hook, state, or network call here, that is a bug.
 */

import styles from './InterviewDonePage.module.css';

export default function InterviewDonePage(): JSX.Element {
  return (
    <main className={styles.doneRoot}>
      <h1 className={styles.doneHeading}>Интервью окончено!</h1>
      <p className={styles.doneSubtitle}>Спасибо за уделённое время!</p>
    </main>
  );
}
