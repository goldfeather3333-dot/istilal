-- Allow customers to delete their own completed documents
CREATE POLICY "Customers can delete own completed documents"
ON public.documents
FOR DELETE
USING (
  user_id = auth.uid() 
  AND status = 'completed'
);