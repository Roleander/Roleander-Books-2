-- Add image_url column to audiobooks table for chapter images
ALTER TABLE audiobooks ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN audiobooks.image_url IS 'URL of the image that accompanies this audio chapter for visual storytelling';
