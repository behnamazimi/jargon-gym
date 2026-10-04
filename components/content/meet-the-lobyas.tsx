import { BLUE, CORAL, PURPLE } from "@/components/illustrations/palette";
import { LobyaPortrait } from "@/components/illustrations/scenes/lobya-portrait";

const LOBYAS = [
  { name: "Lobyaq", color: BLUE, seed: 3 },
  { name: "Lobyar", color: CORAL, seed: 8 },
  { name: "Lobyare", color: PURPLE, seed: 6 },
];

export function MeetTheLobyas() {
  return (
    <ul className="m-0 mt-8 grid list-none grid-cols-3 gap-4 p-0 sm:gap-8">
      {LOBYAS.map((lobya, i) => (
        <li key={lobya.name} className="flex flex-col items-center text-center">
          <LobyaPortrait
            color={lobya.color}
            seed={lobya.seed}
            phase={i * 0.4}
            className="max-w-[9rem]"
          />
          <p className="font-heading m-0 mt-2 text-xl font-medium tracking-tight">{lobya.name}</p>
        </li>
      ))}
    </ul>
  );
}
