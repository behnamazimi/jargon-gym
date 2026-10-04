export function FeatureNumber({ value }: { value: number }) {
  return (
    <p className="m-0 mb-2 font-mono text-sm tracking-widest text-primary-text">
      {String(value).padStart(2, "0")}
    </p>
  );
}
