-- Update the welcome notification function to use Istilal branding
CREATE OR REPLACE FUNCTION public.send_welcome_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_notifications (user_id, title, message)
  VALUES (
    NEW.id,
    'Welcome to Istilal! 🎉',
    'Welcome to Istilal! We ensure all your files are processed securely using advanced similarity detection. Your data privacy is our priority. Thank you for joining us! 🙂'
  );
  RETURN NEW;
END;
$function$;