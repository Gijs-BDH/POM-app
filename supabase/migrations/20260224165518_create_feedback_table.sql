/*
  # Create Feedback System Table

  1. New Tables
    - `feedback`
      - `id` (uuid, primary key) - Unique identifier for each feedback item
      - `page` (text) - Page name where feedback was submitted
      - `title` (text) - Feedback title
      - `description` (text) - Detailed feedback description
      - `image` (text) - Base64 encoded screenshot with highlights
      - `state` (text) - Current state: waiting, active, or done
      - `created_at` (timestamptz) - Timestamp when feedback was created
      - `updated_at` (timestamptz) - Timestamp when feedback was last updated

  2. Security
    - Enable RLS on `feedback` table
    - Add policy for anyone to read feedback (no auth required)
    - Add policy for anyone to create feedback (no auth required)
    - Add policy for anyone to update feedback state (no auth required)

  3. Indexes
    - Index on `state` for efficient filtering
    - Index on `created_at` for sorting
*/

CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  image text NOT NULL,
  state text NOT NULL DEFAULT 'waiting' CHECK (state IN ('waiting', 'active', 'done')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view feedback"
  ON feedback FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can create feedback"
  ON feedback FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anyone can update feedback state"
  ON feedback FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_feedback_state ON feedback(state);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);