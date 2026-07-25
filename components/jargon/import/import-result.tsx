type ImportResultPanelProps = {
  message: string;
};

export function ImportResultPanel({ message }: ImportResultPanelProps) {
  return (
    <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-[13px] text-green-800">
      {message}
    </div>
  );
}
