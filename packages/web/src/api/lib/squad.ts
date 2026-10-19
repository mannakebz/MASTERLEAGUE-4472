import { z } from "zod";
const count = z.number().int().min(0).max(1000000000);
export const photo = z
  .string()
  .max(300)
  .regex(/^$|^league-images\/[a-f0-9-]+\.(jpg|png|webp)$/)
  .default("");
export const playerSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  name: z.string().min(1).max(100),
  position: z.enum(["GK", "DEF", "MID", "FWD"]),
  number: z.number().int().min(1).max(99),
  appearances: count,
  goals: count,
  assists: count,
  cleanSheets: count,
  yellowCards: count,
  redCards: count,
  transferValue: count.default(0),
  bio: z.string().max(2000).default(""),
  photo,
  sample: z.boolean().default(true),
});
export const totwSchema = z.object({
  week: count,
  formation: z.enum(["4-3-3", "4-4-2", "3-5-2"]),
  playerIds: z.array(z.string()).length(11),
  published: z.boolean(),
});
export const emptyTotw = {
  week: 0,
  formation: "4-3-3" as const,
  playerIds: Array(11).fill("") as string[],
  published: false,
};
const names = [
  [
    "Ibrahim Kamara",
    "Daniel Conteh",
    "Musa Sesay",
    "Samuel Koroma",
    "Abdul Bangura",
    "Joseph Kallon",
    "Mohamed Turay",
    "David Mansaray",
    "Alusine Fofanah",
    "Emmanuel Sorie",
    "Lamin Jalloh",
    "Patrick Cole",
    "Osman Sankoh",
    "Michael Keita",
    "Sorie Dumbuya",
  ],
  [
    "Yusuf Bah",
    "Nathan Cooper",
    "Amadu Kargbo",
    "Ismail Diallo",
    "Victor Taylor",
    "Idris Coker",
    "Noah Williams",
    "Alpha Sheriff",
    "Gabriel Mendy",
    "Malik Johnson",
    "Ethan Thomas",
    "Suleiman Sillah",
    "Aaron Davies",
    "Hassan Njie",
    "Joel Peters",
  ],
  [
    "Abdulai Jalloh",
    "Mustapha Kamara",
    "Boubacar Sesay",
    "Saif Conteh",
    "Hamza Koroma",
    "Bilal Turay",
    "Omar Bangura",
    "Rashid Mansaray",
    "Salim Bah",
    "Zakaria Kallon",
    "Nasir Fofanah",
    "Karim Sankoh",
    "Khalid Kargbo",
    "Ahmed Dumbuya",
    "Imran Sillah",
  ],
  [
    "Raphael Cole",
    "Kelvin Coker",
    "Derrick Johnson",
    "Tariq Sheriff",
    "Elijah Keita",
    "Marcus Taylor",
    "Jamal Mendy",
    "Isaac Williams",
    "Leon Cooper",
    "Felix Davies",
    "Darius Thomas",
    "Reuben Peters",
    "Adrian Njie",
    "Tobias Diallo",
    "Zain Sorie",
  ],
];
export function seedPlayers(teamIds: string[]) {
  return teamIds.flatMap((teamId, ti) =>
    names[ti].map((name, i) => ({
      id: `${teamId}-player-${i + 1}`,
      teamId,
      name,
      number: i + 1,
      position: (i === 0 || i === 11
        ? "GK"
        : i < 5 || i === 12
          ? "DEF"
          : i < 8 || i === 13
            ? "MID"
            : "FWD") as "GK" | "DEF" | "MID" | "FWD",
      appearances: 0,
      goals: 0,
      assists: 0,
      cleanSheets: 0,
      yellowCards: 0,
      redCards: 0,
      transferValue: 0,
      bio: "",
      photo: "",
      sample: true,
    })),
  );
}
