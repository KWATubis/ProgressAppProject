// Jędrek's competition prep training plan — 4-Day Push / Pull / Upper / Lower.
// Source of truth: Second Brain vault (Gym/). 2 working sets per exercise.
// Hardcoded because there is a single user and no AI generation yet.

export type PlanExercise = {
  name: string;
  muscleGroup: string;
  sets: number;
  repRange: string;
  rir: string;
  note?: string;
};

export type WorkoutDay = {
  key: "push" | "pull" | "upper" | "lower";
  name: string;
  focus: string;
  exercises: PlanExercise[];
};

export const WORKOUT_PLAN: WorkoutDay[] = [
  {
    key: "push",
    name: "Push",
    focus: "Chest · Shoulders · Triceps · Quads",
    exercises: [
      { name: "Incline barbell press", muscleGroup: "Chest", sets: 2, repRange: "4–6", rir: "1–2", note: "Upper chest strength anchor" },
      { name: "Low-to-high cable fly", muscleGroup: "Chest", sets: 2, repRange: "12–15", rir: "0", note: "Lower chest detail + inner line" },
      { name: "OHP (barbell or Smith)", muscleGroup: "Shoulders", sets: 2, repRange: "5–7", rir: "1", note: "Shoulder strength movement" },
      { name: "Cable lateral raise", muscleGroup: "Shoulders", sets: 2, repRange: "12–15", rir: "0", note: "Mid delt isolation" },
      { name: "Skull crushers (EZ bar)", muscleGroup: "Triceps", sets: 2, repRange: "8–10", rir: "1", note: "Long head — elbows point back" },
      { name: "Hack squat or leg press", muscleGroup: "Quads", sets: 2, repRange: "8–12", rir: "1–2", note: "Main quad compound, feet narrow" },
      { name: "Leg extension", muscleGroup: "Quads", sets: 2, repRange: "12–15", rir: "0", note: "Finisher — pause at top" },
    ],
  },
  {
    key: "pull",
    name: "Pull",
    focus: "Back · Biceps · Rear Delts · Hamstrings · Calves",
    exercises: [
      { name: "Deadlift (conventional)", muscleGroup: "Back", sets: 2, repRange: "4–6", rir: "1–2", note: "Strength anchor — ham + back in one" },
      { name: "Weighted pull-up", muscleGroup: "Back", sets: 2, repRange: "4–6", rir: "1–2", note: "Width + strength" },
      { name: "Barbell row", muscleGroup: "Back", sets: 2, repRange: "5–8", rir: "1–2", note: "Thickness — mid/lower trap" },
      { name: "Face pull", muscleGroup: "Rear Delts", sets: 2, repRange: "15", rir: "0", note: "Rear delt + shoulder health" },
      { name: "Incline dumbbell curl", muscleGroup: "Biceps", sets: 2, repRange: "10–12", rir: "1", note: "Long head stretch — best for bicep peak" },
      { name: "Romanian deadlift", muscleGroup: "Hamstrings", sets: 2, repRange: "8–10", rir: "1–2", note: "Ham stretch under load" },
      { name: "Seated calf raise", muscleGroup: "Calves", sets: 2, repRange: "15–20", rir: "0", note: "Soleus focus — slow reps, full ROM" },
    ],
  },
  {
    key: "upper",
    name: "Upper",
    focus: "Chest · Back · Shoulders · Arms",
    exercises: [
      { name: "Flat dumbbell press", muscleGroup: "Chest", sets: 2, repRange: "8–10", rir: "1", note: "Different angle to Push day" },
      { name: "High-to-low cable fly", muscleGroup: "Chest", sets: 2, repRange: "12–15", rir: "0", note: "Inner chest detail — stage lines" },
      { name: "Underhand lat pulldown", muscleGroup: "Back", sets: 2, repRange: "10–12", rir: "1", note: "Lower lat focus — width from below" },
      { name: "Single arm dumbbell row", muscleGroup: "Back", sets: 2, repRange: "10–12", rir: "1", note: "Full stretch at bottom" },
      { name: "Dumbbell lateral raise", muscleGroup: "Shoulders", sets: 2, repRange: "15", rir: "0", note: "Mid delt — slightly in front of body" },
      { name: "EZ bar curl", muscleGroup: "Biceps", sets: 2, repRange: "10–12", rir: "1", note: "Control the eccentric" },
      { name: "Cable overhead tricep extension", muscleGroup: "Triceps", sets: 2, repRange: "12–15", rir: "0", note: "Long head stretch" },
    ],
  },
  {
    key: "lower",
    name: "Lower",
    focus: "Hamstrings · Glutes · Abductors · Hip Flexors · Calves",
    exercises: [
      { name: "Barbell squat", muscleGroup: "Hamstrings", sets: 2, repRange: "5–8", rir: "1–2", note: "Strength anchor — glute + ham dominant" },
      { name: "Nordic curl", muscleGroup: "Hamstrings", sets: 2, repRange: "6–8", rir: "1", note: "Eccentric ham overload — best ham builder" },
      { name: "Hip thrust (barbell)", muscleGroup: "Glutes", sets: 2, repRange: "8–12", rir: "1", note: "Glute max — hold at top" },
      { name: "Cable hip abduction", muscleGroup: "Abductors", sets: 2, repRange: "12–15", rir: "0", note: "Glute med + outer hip — stage width" },
      { name: "Cable hip flexor raise", muscleGroup: "Hip Flexors", sets: 2, repRange: "12–15", rir: "0", note: "Standing cable, knee drives up" },
      { name: "Seated calf raise", muscleGroup: "Calves", sets: 2, repRange: "15–20", rir: "0", note: "Soleus — slow reps, full ROM" },
    ],
  },
];

export function getWorkoutDay(key: string): WorkoutDay | undefined {
  return WORKOUT_PLAN.find((d) => d.key === key);
}
