export type UserTheme = "light" | "dark";
export type UserPreferences = { theme: UserTheme; paletteId: string };

export function normalizeUserPreferences(
  input: { theme?: string | null; paletteId?: string | null },
  allowedPalettes: string[],
): UserPreferences {
  const fallbackPalette = allowedPalettes[0] ?? "padelhub";
  return {
    theme: input.theme === "dark" ? "dark" : "light",
    paletteId:
      input.paletteId && allowedPalettes.includes(input.paletteId)
        ? input.paletteId
        : fallbackPalette,
  };
}
