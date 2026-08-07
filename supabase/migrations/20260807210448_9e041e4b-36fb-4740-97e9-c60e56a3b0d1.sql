-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT,
  goal TEXT NOT NULL DEFAULT 'general',
  experience TEXT NOT NULL DEFAULT 'intermediate',
  weight_unit TEXT NOT NULL DEFAULT 'kg',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- exercises
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  muscle TEXT NOT NULL DEFAULT 'other',
  equipment TEXT NOT NULL DEFAULT 'other',
  is_builtin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercises TO authenticated;
GRANT SELECT ON public.exercises TO anon;
GRANT ALL ON public.exercises TO service_role;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "builtin exercises readable" ON public.exercises FOR SELECT USING (is_builtin = true);
CREATE POLICY "own exercises read" ON public.exercises FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own exercises write" ON public.exercises FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND is_builtin = false);
CREATE POLICY "own exercises update" ON public.exercises FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own exercises delete" ON public.exercises FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- routines
CREATE TABLE public.routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  notes TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.routines TO authenticated;
GRANT ALL ON public.routines TO service_role;
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own routines" ON public.routines FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- workouts
CREATE TABLE public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Workout',
  notes TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workouts TO authenticated;
GRANT ALL ON public.workouts TO service_role;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own workouts" ON public.workouts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- workout_sets
CREATE TABLE public.workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  workout_id UUID NOT NULL REFERENCES public.workouts ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  set_index INTEGER NOT NULL DEFAULT 1,
  weight NUMERIC(7,2) NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  rpe NUMERIC(3,1),
  set_type TEXT NOT NULL DEFAULT 'normal',
  completed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX workout_sets_workout_idx ON public.workout_sets (workout_id);
CREATE INDEX workout_sets_user_exercise_idx ON public.workout_sets (user_id, exercise_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sets TO authenticated;
GRANT ALL ON public.workout_sets TO service_role;
ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sets" ON public.workout_sets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- body weight
CREATE TABLE public.body_weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  weight NUMERIC(6,2) NOT NULL,
  logged_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, logged_on)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.body_weight_logs TO authenticated;
GRANT ALL ON public.body_weight_logs TO service_role;
ALTER TABLE public.body_weight_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own weights" ON public.body_weight_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- activities
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  kind TEXT NOT NULL,
  duration_min INTEGER NOT NULL DEFAULT 0,
  intensity TEXT NOT NULL DEFAULT 'moderate',
  notes TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own activities" ON public.activities FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- coach messages
CREATE TABLE public.coach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX coach_messages_user_idx ON public.coach_messages (user_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_messages TO authenticated;
GRANT ALL ON public.coach_messages TO service_role;
ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own coach messages" ON public.coach_messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER routines_updated BEFORE UPDATE ON public.routines FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- auto profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- seed built-in exercises
INSERT INTO public.exercises (name, muscle, equipment, is_builtin) VALUES
('Barbell Bench Press','chest','barbell',true),
('Incline Barbell Bench Press','chest','barbell',true),
('Dumbbell Bench Press','chest','dumbbell',true),
('Incline Dumbbell Press','chest','dumbbell',true),
('Cable Chest Fly','chest','cable',true),
('Machine Chest Press','chest','machine',true),
('Push Up','chest','bodyweight',true),
('Dip','chest','bodyweight',true),
('Back Squat','quads','barbell',true),
('Front Squat','quads','barbell',true),
('Hack Squat','quads','machine',true),
('Leg Press','quads','machine',true),
('Leg Extension','quads','machine',true),
('Bulgarian Split Squat','quads','dumbbell',true),
('Walking Lunge','quads','dumbbell',true),
('Goblet Squat','quads','dumbbell',true),
('Conventional Deadlift','hamstrings','barbell',true),
('Romanian Deadlift','hamstrings','barbell',true),
('Sumo Deadlift','hamstrings','barbell',true),
('Leg Curl','hamstrings','machine',true),
('Nordic Curl','hamstrings','bodyweight',true),
('Hip Thrust','glutes','barbell',true),
('Cable Kickback','glutes','cable',true),
('Standing Calf Raise','calves','machine',true),
('Seated Calf Raise','calves','machine',true),
('Pull Up','back','bodyweight',true),
('Chin Up','back','bodyweight',true),
('Lat Pulldown','back','cable',true),
('Barbell Row','back','barbell',true),
('Pendlay Row','back','barbell',true),
('Dumbbell Row','back','dumbbell',true),
('Seated Cable Row','back','cable',true),
('Chest Supported Row','back','machine',true),
('Straight Arm Pulldown','back','cable',true),
('Face Pull','back','cable',true),
('Barbell Shrug','back','barbell',true),
('Overhead Press','shoulders','barbell',true),
('Seated Dumbbell Press','shoulders','dumbbell',true),
('Arnold Press','shoulders','dumbbell',true),
('Lateral Raise','shoulders','dumbbell',true),
('Cable Lateral Raise','shoulders','cable',true),
('Rear Delt Fly','shoulders','dumbbell',true),
('Barbell Curl','biceps','barbell',true),
('Dumbbell Curl','biceps','dumbbell',true),
('Incline Dumbbell Curl','biceps','dumbbell',true),
('Hammer Curl','biceps','dumbbell',true),
('Preacher Curl','biceps','machine',true),
('Cable Curl','biceps','cable',true),
('Close Grip Bench Press','triceps','barbell',true),
('Skull Crusher','triceps','barbell',true),
('Cable Triceps Pushdown','triceps','cable',true),
('Overhead Cable Extension','triceps','cable',true),
('Triceps Dip','triceps','bodyweight',true),
('Plank','core','bodyweight',true),
('Hanging Leg Raise','core','bodyweight',true),
('Cable Crunch','core','cable',true),
('Ab Wheel Rollout','core','other',true),
('Russian Twist','core','other',true),
('Back Extension','core','bodyweight',true),
('Farmers Carry','core','dumbbell',true),
('Wrist Curl','forearms','dumbbell',true),
('Reverse Curl','forearms','barbell',true);