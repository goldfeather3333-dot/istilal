-- Update the send_welcome_notification function to remove Turnitin references
CREATE OR REPLACE FUNCTION public.send_welcome_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_notifications (user_id, title, message)
  VALUES (
    NEW.id,
    'Welcome 🙏',
    'Welcome to PlagaiScans! We ensure all your files are processed securely using advanced similarity detection. Your data privacy is our priority. Thank you for joining us! 🙂'
  );
  RETURN NEW;
END;
$$;