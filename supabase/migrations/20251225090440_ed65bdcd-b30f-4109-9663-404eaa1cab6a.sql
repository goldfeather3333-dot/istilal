-- Drop the existing incomplete policy
DROP POLICY IF EXISTS "Admin can manage roles" ON public.user_roles;

-- Create proper policies for admin to manage roles (with WITH CHECK for INSERT/UPDATE)
CREATE POLICY "Admin can insert roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can update roles" 
ON public.user_roles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can delete roles" 
ON public.user_roles 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));