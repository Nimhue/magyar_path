import { lessons } from "../content";
import { isUnlocked, lessonStatus } from "../lib/progress";
import { useProgress } from "../lib/store";
import { Icon, Ring } from "./ui";

/** Lists lessons with their lock state. Locked lessons explain what to finish first. */
export function LessonPicker({
  hrefFor,
  detail,
}: {
  hrefFor: (lessonId: string) => string;
  detail?: (lessonId: string) => string;
}) {
  const p = useProgress();
  return (
    <ul className="lesson-list">
      {lessons.map((l, i) => {
        const open = isUnlocked(l.id, p);
        const st = lessonStatus(l, p);
        const inner = (
          <>
            <Ring value={st.fraction} size={40} stroke={4}>
              {open ? (st.complete ? <Icon name="check" size={16} /> : <span>{l.order}</span>) : <Icon name="lock" size={15} />}
            </Ring>
            <div className="ll-text">
              <strong>{l.title}</strong>
              <span className="muted">
                {open ? (detail ? detail(l.id) : l.titleEn) : `Finish “${lessons[i - 1]?.title}” to unlock`}
              </span>
            </div>
          </>
        );
        return (
          <li key={l.id}>
            {open ? (
              <a className="ll-item" href={hrefFor(l.id)}>
                {inner}
                <Icon name="back" size={16} />
              </a>
            ) : (
              <div className="ll-item locked" aria-disabled="true">
                {inner}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
