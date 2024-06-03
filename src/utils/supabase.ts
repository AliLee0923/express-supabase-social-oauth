import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_KEY || "";
// const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3Y2x3aXl5bmVwdmxxYmdyZ2FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTU2MTU5MzksImV4cCI6MjAzMTE5MTkzOX0.Kaq3kX5KjHOtZUe_DL3O3gCswMweXMkgvdd5uS9axsY"

export const supabase = createClient(supabaseUrl, supabaseServiceKey);
