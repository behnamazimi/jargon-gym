const PASSWORD_MIN_LENGTH = 8;

type PasswordRequirement = {
  id: string;
  label: string;
  test: (password: string) => boolean;
};

const PASSWORD_REQUIREMENT_DEFS: PasswordRequirement[] = [
  {
    id: "length",
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (password) => password.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: "letter",
    label: "Includes a letter",
    test: (password) => /[a-zA-Z]/.test(password),
  },
  {
    id: "digit",
    label: "Includes a number",
    test: (password) => /\d/.test(password),
  },
];

export type PasswordRequirementResult = {
  id: string;
  label: string;
  met: boolean;
};

export function evaluatePasswordRequirements(password: string): PasswordRequirementResult[] {
  return PASSWORD_REQUIREMENT_DEFS.map(({ id, label, test }) => ({
    id,
    label,
    met: test(password),
  }));
}

export function getPasswordValidationError(password: string): string | null {
  const failed = evaluatePasswordRequirements(password).find((requirement) => !requirement.met);
  if (!failed) {
    return null;
  }

  return "Use at least 8 characters with a letter and a number.";
}
