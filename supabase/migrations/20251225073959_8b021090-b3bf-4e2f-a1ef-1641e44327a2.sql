-- Add new columns for document name tracking
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS original_file_name text,
ADD COLUMN IF NOT EXISTS is_pdf_original boolean DEFAULT false;

-- Create index for faster matching
CREATE INDEX IF NOT EXISTS idx_documents_original_file_name ON public.documents(original_file_name);

-- Update existing documents to set original_file_name based on current file_name
UPDATE public.documents 
SET original_file_name = regexp_replace(
  regexp_replace(file_name, '\.[^.]+$', ''), -- Remove extension
  '\s*\(\d+\)\s*$', '' -- Remove trailing bracket number for base name
) || CASE 
  WHEN file_name ~ '\(\d+\)\.[^.]+$' THEN ' ' || regexp_replace(file_name, '^.*(\(\d+\))\.[^.]+$', '\1')
  ELSE ''
END,
is_pdf_original = LOWER(file_name) LIKE '%.pdf'
WHERE original_file_name IS NULL;