export function ProcessSteps({ steps, current = 0 }: { steps: string[]; current?: number }) {
  if (!steps.length) return null;
  return (
    <ol className="process">
      {steps.map((step, index) => (
        <li key={`${index}-${step}`} className={index === current ? "current" : index < current ? "done" : ""}>
          <span>{index + 1}</span>
          {step}
        </li>
      ))}
    </ol>
  );
}
