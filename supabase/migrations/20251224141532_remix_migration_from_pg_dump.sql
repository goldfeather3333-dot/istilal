CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'staff',
    'customer'
);


--
-- Name: document_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.document_status AS ENUM (
    'pending',
    'in_progress',
    'completed'
);


--
-- Name: generate_referral_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_referral_code() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.referral_code := 'REF' || UPPER(SUBSTRING(MD5(NEW.id::text || NOW()::text) FROM 1 FOR 8));
  RETURN NEW;
END;
$$;


--
-- Name: get_user_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role(_user_id uuid) RETURNS public.app_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    -- Insert into profiles
    INSERT INTO public.profiles (id, email, full_name, phone)
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', '')
    );
    
    -- Assign customer role by default
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'customer');
    
    RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role = _role
    )
$$;


--
-- Name: normalize_filename(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.normalize_filename(filename text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public'
    AS $_$
DECLARE
  result text;
BEGIN
  -- Convert to lowercase
  result := lower(filename);
  
  -- Remove file extension only - keep all brackets as part of the base name
  result := regexp_replace(result, '\.[^.]+$', '');
  
  -- Trim whitespace
  result := trim(result);
  
  RETURN result;
END;
$_$;


--
-- Name: notify_staff_on_document_upload(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_staff_on_document_upload() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  customer_email text;
  customer_name text;
BEGIN
  -- Only trigger for new documents uploaded by customers (not magic links)
  IF NEW.user_id IS NOT NULL THEN
    -- Get customer info
    SELECT email, full_name INTO customer_email, customer_name
    FROM public.profiles
    WHERE id = NEW.user_id;
    
    -- Insert a record to trigger the edge function (we'll use a separate table for this)
    INSERT INTO public.document_upload_notifications (document_id, customer_email, customer_name, file_name)
    VALUES (NEW.id, customer_email, COALESCE(customer_name, 'Customer'), NEW.file_name);
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: send_welcome_notification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.send_welcome_notification() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.user_notifications (user_id, title, message)
  VALUES (
    NEW.id,
    'Welcome 🙏',
    'Hello Everyone! We ensure everyone of you that all the files are processed in Non Repository Turnitin Instructor Accounts. All your data will not be saved there. Thanks for attention 🙂 ☺️'
  );
  RETURN NEW;
END;
$$;


--
-- Name: set_normalized_filename(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_normalized_filename() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.normalized_filename := public.normalize_filename(NEW.file_name);
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


--
-- Name: validate_document_upload_credits(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_document_upload_credits() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  user_credits INTEGER;
BEGIN
  -- Skip validation for magic link uploads (guest uploads don't require credits)
  IF NEW.magic_link_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Skip validation if user_id is null
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get user's current credit balance
  SELECT credit_balance INTO user_credits
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  -- Check if user has sufficient credits
  IF user_credits IS NULL OR user_credits < 1 THEN
    RAISE EXCEPTION 'Insufficient credits. You need at least 1 credit to upload a document.';
  END IF;
  
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id uuid NOT NULL,
    document_id uuid NOT NULL,
    action text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_admin_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_admin_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    is_enabled boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid
);


--
-- Name: ai_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid NOT NULL,
    prompt_text text NOT NULL,
    ai_response text NOT NULL,
    proposed_changes jsonb,
    status text DEFAULT 'pending'::text NOT NULL,
    version_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone
);


--
-- Name: ai_change_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_change_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    version_number integer NOT NULL,
    change_type text NOT NULL,
    change_description text NOT NULL,
    affected_areas text[] DEFAULT '{}'::text[] NOT NULL,
    changes_json jsonb NOT NULL,
    applied_by uuid NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    rolled_back_at timestamp with time zone,
    rolled_back_by uuid
);


--
-- Name: ai_change_versions_version_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_change_versions_version_number_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_change_versions_version_number_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_change_versions_version_number_seq OWNED BY public.ai_change_versions.version_number;


--
-- Name: announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text DEFAULT 'info'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    show_from timestamp with time zone DEFAULT now(),
    show_until timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: blocked_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blocked_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    reason text,
    blocked_by uuid,
    blocked_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: credit_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credit_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    amount integer NOT NULL,
    balance_before integer NOT NULL,
    balance_after integer NOT NULL,
    transaction_type text NOT NULL,
    description text,
    performed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT credit_transactions_transaction_type_check CHECK ((transaction_type = ANY (ARRAY['add'::text, 'deduct'::text, 'usage'::text])))
);


--
-- Name: crypto_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crypto_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    payment_id text NOT NULL,
    order_id text,
    credits integer NOT NULL,
    amount_usd numeric NOT NULL,
    pay_amount numeric,
    pay_currency text DEFAULT 'USDTTRC20'::text,
    pay_address text,
    status text DEFAULT 'waiting'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: document_tag_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_tag_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: document_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    color text DEFAULT '#6366f1'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: document_upload_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_upload_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    customer_email text,
    customer_name text,
    file_name text NOT NULL,
    processed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    file_name text NOT NULL,
    file_path text NOT NULL,
    status public.document_status DEFAULT 'pending'::public.document_status NOT NULL,
    assigned_staff_id uuid,
    similarity_percentage numeric(5,2),
    ai_percentage numeric(5,2),
    similarity_report_path text,
    ai_report_path text,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    error_message text,
    remarks text,
    assigned_at timestamp with time zone,
    magic_link_id uuid,
    is_favorite boolean DEFAULT false,
    normalized_filename text,
    needs_review boolean DEFAULT false,
    review_reason text
);


--
-- Name: email_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type text DEFAULT 'custom'::text NOT NULL,
    subject text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    cta_text text,
    cta_url text,
    target_audience text DEFAULT 'all'::text NOT NULL,
    recipient_count integer DEFAULT 0 NOT NULL,
    success_count integer DEFAULT 0 NOT NULL,
    failed_count integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    sent_by uuid,
    scheduled_at timestamp with time zone,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: email_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    setting_key text NOT NULL,
    setting_name text NOT NULL,
    description text,
    is_enabled boolean DEFAULT true NOT NULL,
    category text DEFAULT 'transactional'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid
);


--
-- Name: magic_upload_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.magic_upload_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    magic_link_id uuid NOT NULL,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_size bigint,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: magic_upload_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.magic_upload_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token text NOT NULL,
    max_uploads integer DEFAULT 1 NOT NULL,
    current_uploads integer DEFAULT 0 NOT NULL,
    expires_at timestamp with time zone,
    status text DEFAULT 'active'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT magic_upload_links_status_check CHECK ((status = ANY (ARRAY['active'::text, 'expired'::text, 'disabled'::text])))
);


--
-- Name: manual_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.manual_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    payment_method text NOT NULL,
    amount_usd numeric NOT NULL,
    credits integer NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    transaction_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    verified_at timestamp with time zone,
    verified_by uuid,
    notes text
);

ALTER TABLE ONLY public.manual_payments REPLICA IDENTITY FULL;


--
-- Name: notification_reads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_reads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    notification_id uuid NOT NULL,
    user_id uuid NOT NULL,
    read_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    category text DEFAULT 'system'::text NOT NULL,
    target_audience text DEFAULT 'all'::text NOT NULL,
    CONSTRAINT notifications_category_check CHECK ((category = ANY (ARRAY['system'::text, 'promotional'::text, 'updates'::text]))),
    CONSTRAINT notifications_target_audience_check CHECK ((target_audience = ANY (ARRAY['all'::text, 'customers'::text, 'staff'::text, 'admins'::text])))
);


--
-- Name: pricing_packages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pricing_packages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    credits integer NOT NULL,
    price numeric(10,2) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    phone text,
    credit_balance integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    referral_code text,
    referred_by uuid
);


--
-- Name: promo_code_uses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promo_code_uses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    promo_code_id uuid NOT NULL,
    user_id uuid NOT NULL,
    credits_given integer DEFAULT 0 NOT NULL,
    used_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: promo_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promo_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    credits_bonus integer DEFAULT 0 NOT NULL,
    discount_percentage integer DEFAULT 0,
    max_uses integer,
    current_uses integer DEFAULT 0 NOT NULL,
    valid_from timestamp with time zone DEFAULT now(),
    valid_until timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: push_notification_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_notification_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    target_audience text DEFAULT 'all'::text NOT NULL,
    target_user_id uuid,
    sent_by uuid,
    recipient_count integer DEFAULT 0 NOT NULL,
    success_count integer DEFAULT 0 NOT NULL,
    failed_count integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone
);


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: referrals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referrals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referrer_id uuid NOT NULL,
    referred_user_id uuid,
    referral_code text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    credits_earned integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone
);


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: staff_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    permission_key text NOT NULL,
    permission_name text NOT NULL,
    description text,
    is_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: staff_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    time_limit_minutes integer DEFAULT 30 NOT NULL,
    max_concurrent_files integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    admin_response text,
    responded_by uuid,
    responded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: unmatched_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unmatched_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    file_name text NOT NULL,
    normalized_filename text NOT NULL,
    file_path text NOT NULL,
    uploaded_by uuid,
    uploaded_at timestamp with time zone DEFAULT now(),
    resolved boolean DEFAULT false,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    matched_document_id uuid,
    report_type text,
    CONSTRAINT unmatched_reports_report_type_check CHECK ((report_type = ANY (ARRAY['similarity'::text, 'ai'::text])))
);


--
-- Name: usdt_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usdt_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payment_id uuid,
    admin_id uuid NOT NULL,
    action text NOT NULL,
    details jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: usdt_payment_rate_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usdt_payment_rate_limits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: usdt_trc20_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usdt_trc20_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    order_id text NOT NULL,
    expected_usdt_amount numeric(20,6) NOT NULL,
    received_usdt_amount numeric(20,6) DEFAULT 0,
    credits_to_add integer NOT NULL,
    credits_added integer DEFAULT 0,
    wallet_address text NOT NULL,
    wallet_index integer NOT NULL,
    tx_hash text,
    tx_confirmations integer DEFAULT 0,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    confirmed_at timestamp with time zone,
    admin_verified_by uuid,
    admin_verified_at timestamp with time zone,
    admin_notes text,
    refund_wallet_address text,
    refund_amount numeric(20,6),
    refund_tx_hash text,
    refunded_at timestamp with time zone,
    refunded_by uuid,
    ip_address text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT usdt_trc20_payments_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirming'::text, 'confirmed'::text, 'underpaid'::text, 'overpaid'::text, 'expired'::text, 'refunded'::text, 'cancelled'::text])))
);


--
-- Name: usdt_used_tx_hashes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usdt_used_tx_hashes (
    tx_hash text NOT NULL,
    payment_id uuid NOT NULL,
    used_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: usdt_wallet_counter; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usdt_wallet_counter (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    current_index integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_notification_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    system_enabled boolean DEFAULT true NOT NULL,
    promotional_enabled boolean DEFAULT true NOT NULL,
    updates_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    document_upload_enabled boolean DEFAULT true NOT NULL
);


--
-- Name: user_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    read_at timestamp with time zone,
    created_by uuid
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'customer'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: viva_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.viva_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    order_code text NOT NULL,
    amount_usd numeric(10,2) NOT NULL,
    credits integer NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    transaction_id text,
    merchant_trns text,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_change_versions version_number; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_change_versions ALTER COLUMN version_number SET DEFAULT nextval('public.ai_change_versions_version_number_seq'::regclass);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: ai_admin_settings ai_admin_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_admin_settings
    ADD CONSTRAINT ai_admin_settings_pkey PRIMARY KEY (id);


--
-- Name: ai_audit_logs ai_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_audit_logs
    ADD CONSTRAINT ai_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: ai_change_versions ai_change_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_change_versions
    ADD CONSTRAINT ai_change_versions_pkey PRIMARY KEY (id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: blocked_users blocked_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_users
    ADD CONSTRAINT blocked_users_pkey PRIMARY KEY (id);


--
-- Name: blocked_users blocked_users_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_users
    ADD CONSTRAINT blocked_users_user_id_key UNIQUE (user_id);


--
-- Name: credit_transactions credit_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_transactions
    ADD CONSTRAINT credit_transactions_pkey PRIMARY KEY (id);


--
-- Name: crypto_payments crypto_payments_payment_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crypto_payments
    ADD CONSTRAINT crypto_payments_payment_id_key UNIQUE (payment_id);


--
-- Name: crypto_payments crypto_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crypto_payments
    ADD CONSTRAINT crypto_payments_pkey PRIMARY KEY (id);


--
-- Name: document_tag_assignments document_tag_assignments_document_id_tag_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_tag_assignments
    ADD CONSTRAINT document_tag_assignments_document_id_tag_id_key UNIQUE (document_id, tag_id);


--
-- Name: document_tag_assignments document_tag_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_tag_assignments
    ADD CONSTRAINT document_tag_assignments_pkey PRIMARY KEY (id);


--
-- Name: document_tags document_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_tags
    ADD CONSTRAINT document_tags_pkey PRIMARY KEY (id);


--
-- Name: document_upload_notifications document_upload_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_upload_notifications
    ADD CONSTRAINT document_upload_notifications_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: email_logs email_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_pkey PRIMARY KEY (id);


--
-- Name: email_settings email_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_settings
    ADD CONSTRAINT email_settings_pkey PRIMARY KEY (id);


--
-- Name: email_settings email_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_settings
    ADD CONSTRAINT email_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: magic_upload_files magic_upload_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_upload_files
    ADD CONSTRAINT magic_upload_files_pkey PRIMARY KEY (id);


--
-- Name: magic_upload_links magic_upload_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_upload_links
    ADD CONSTRAINT magic_upload_links_pkey PRIMARY KEY (id);


--
-- Name: magic_upload_links magic_upload_links_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_upload_links
    ADD CONSTRAINT magic_upload_links_token_key UNIQUE (token);


--
-- Name: manual_payments manual_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manual_payments
    ADD CONSTRAINT manual_payments_pkey PRIMARY KEY (id);


--
-- Name: notification_reads notification_reads_notification_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_reads
    ADD CONSTRAINT notification_reads_notification_id_user_id_key UNIQUE (notification_id, user_id);


--
-- Name: notification_reads notification_reads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_reads
    ADD CONSTRAINT notification_reads_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: pricing_packages pricing_packages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_packages
    ADD CONSTRAINT pricing_packages_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_referral_code_key UNIQUE (referral_code);


--
-- Name: promo_code_uses promo_code_uses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_code_uses
    ADD CONSTRAINT promo_code_uses_pkey PRIMARY KEY (id);


--
-- Name: promo_code_uses promo_code_uses_promo_code_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_code_uses
    ADD CONSTRAINT promo_code_uses_promo_code_id_user_id_key UNIQUE (promo_code_id, user_id);


--
-- Name: promo_codes promo_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT promo_codes_code_key UNIQUE (code);


--
-- Name: promo_codes promo_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT promo_codes_pkey PRIMARY KEY (id);


--
-- Name: push_notification_logs push_notification_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_notification_logs
    ADD CONSTRAINT push_notification_logs_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_user_id_endpoint_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_endpoint_key UNIQUE (user_id, endpoint);


--
-- Name: referrals referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_pkey PRIMARY KEY (id);


--
-- Name: referrals referrals_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referral_code_key UNIQUE (referral_code);


--
-- Name: referrals referrals_referred_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referred_user_id_key UNIQUE (referred_user_id);


--
-- Name: settings settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_key_key UNIQUE (key);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: staff_permissions staff_permissions_permission_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_permissions
    ADD CONSTRAINT staff_permissions_permission_key_key UNIQUE (permission_key);


--
-- Name: staff_permissions staff_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_permissions
    ADD CONSTRAINT staff_permissions_pkey PRIMARY KEY (id);


--
-- Name: staff_settings staff_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_settings
    ADD CONSTRAINT staff_settings_pkey PRIMARY KEY (id);


--
-- Name: staff_settings staff_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_settings
    ADD CONSTRAINT staff_settings_user_id_key UNIQUE (user_id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: unmatched_reports unmatched_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unmatched_reports
    ADD CONSTRAINT unmatched_reports_pkey PRIMARY KEY (id);


--
-- Name: usdt_audit_log usdt_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usdt_audit_log
    ADD CONSTRAINT usdt_audit_log_pkey PRIMARY KEY (id);


--
-- Name: usdt_payment_rate_limits usdt_payment_rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usdt_payment_rate_limits
    ADD CONSTRAINT usdt_payment_rate_limits_pkey PRIMARY KEY (id);


--
-- Name: usdt_trc20_payments usdt_trc20_payments_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usdt_trc20_payments
    ADD CONSTRAINT usdt_trc20_payments_order_id_key UNIQUE (order_id);


--
-- Name: usdt_trc20_payments usdt_trc20_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usdt_trc20_payments
    ADD CONSTRAINT usdt_trc20_payments_pkey PRIMARY KEY (id);


--
-- Name: usdt_used_tx_hashes usdt_used_tx_hashes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usdt_used_tx_hashes
    ADD CONSTRAINT usdt_used_tx_hashes_pkey PRIMARY KEY (tx_hash);


--
-- Name: usdt_wallet_counter usdt_wallet_counter_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usdt_wallet_counter
    ADD CONSTRAINT usdt_wallet_counter_pkey PRIMARY KEY (id);


--
-- Name: user_notification_preferences user_notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_preferences
    ADD CONSTRAINT user_notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_notification_preferences user_notification_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_preferences
    ADD CONSTRAINT user_notification_preferences_user_id_key UNIQUE (user_id);


--
-- Name: user_notifications user_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notifications
    ADD CONSTRAINT user_notifications_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: viva_payments viva_payments_order_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viva_payments
    ADD CONSTRAINT viva_payments_order_code_key UNIQUE (order_code);


--
-- Name: viva_payments viva_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viva_payments
    ADD CONSTRAINT viva_payments_pkey PRIMARY KEY (id);


--
-- Name: idx_credit_transactions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_credit_transactions_created_at ON public.credit_transactions USING btree (created_at DESC);


--
-- Name: idx_credit_transactions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_credit_transactions_user_id ON public.credit_transactions USING btree (user_id);


--
-- Name: idx_documents_normalized_filename; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_normalized_filename ON public.documents USING btree (normalized_filename);


--
-- Name: idx_email_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_logs_created_at ON public.email_logs USING btree (created_at DESC);


--
-- Name: idx_email_logs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_logs_status ON public.email_logs USING btree (status);


--
-- Name: idx_email_settings_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_settings_key ON public.email_settings USING btree (setting_key);


--
-- Name: idx_magic_upload_links_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_magic_upload_links_token ON public.magic_upload_links USING btree (token);


--
-- Name: idx_rate_limits_ip; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rate_limits_ip ON public.usdt_payment_rate_limits USING btree (ip_address, created_at);


--
-- Name: idx_rate_limits_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rate_limits_user ON public.usdt_payment_rate_limits USING btree (user_id, created_at);


--
-- Name: idx_usdt_payments_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usdt_payments_expires ON public.usdt_trc20_payments USING btree (expires_at) WHERE (status = 'pending'::text);


--
-- Name: idx_usdt_payments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usdt_payments_status ON public.usdt_trc20_payments USING btree (status);


--
-- Name: idx_usdt_payments_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usdt_payments_user ON public.usdt_trc20_payments USING btree (user_id);


--
-- Name: idx_usdt_payments_wallet; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_usdt_payments_wallet ON public.usdt_trc20_payments USING btree (wallet_address);


--
-- Name: idx_user_notification_preferences_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_notification_preferences_user_id ON public.user_notification_preferences USING btree (user_id);


--
-- Name: idx_user_notifications_user_id_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_notifications_user_id_created_at ON public.user_notifications USING btree (user_id, created_at DESC);


--
-- Name: idx_viva_payments_order_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_viva_payments_order_code ON public.viva_payments USING btree (order_code);


--
-- Name: idx_viva_payments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_viva_payments_status ON public.viva_payments USING btree (status);


--
-- Name: idx_viva_payments_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_viva_payments_user_id ON public.viva_payments USING btree (user_id);


--
-- Name: documents on_document_upload_notify; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_document_upload_notify AFTER INSERT ON public.documents FOR EACH ROW EXECUTE FUNCTION public.notify_staff_on_document_upload();


--
-- Name: profiles on_profile_create_referral_code; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_profile_create_referral_code BEFORE INSERT ON public.profiles FOR EACH ROW WHEN ((new.referral_code IS NULL)) EXECUTE FUNCTION public.generate_referral_code();


--
-- Name: profiles on_profile_created_welcome; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_profile_created_welcome AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.send_welcome_notification();


--
-- Name: documents set_normalized_filename_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_normalized_filename_trigger BEFORE INSERT OR UPDATE OF file_name ON public.documents FOR EACH ROW EXECUTE FUNCTION public.set_normalized_filename();


--
-- Name: crypto_payments update_crypto_payments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_crypto_payments_updated_at BEFORE UPDATE ON public.crypto_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: documents update_documents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: magic_upload_links update_magic_upload_links_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_magic_upload_links_updated_at BEFORE UPDATE ON public.magic_upload_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_notification_preferences update_notification_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON public.user_notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pricing_packages update_pricing_packages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_pricing_packages_updated_at BEFORE UPDATE ON public.pricing_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: promo_codes update_promo_codes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_promo_codes_updated_at BEFORE UPDATE ON public.promo_codes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: push_subscriptions update_push_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_push_subscriptions_updated_at BEFORE UPDATE ON public.push_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: settings update_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: staff_permissions update_staff_permissions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_staff_permissions_updated_at BEFORE UPDATE ON public.staff_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: staff_settings update_staff_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_staff_settings_updated_at BEFORE UPDATE ON public.staff_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: support_tickets update_support_tickets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: usdt_trc20_payments update_usdt_payments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_usdt_payments_updated_at BEFORE UPDATE ON public.usdt_trc20_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: viva_payments update_viva_payments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_viva_payments_updated_at BEFORE UPDATE ON public.viva_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: documents validate_credits_before_upload; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_credits_before_upload BEFORE INSERT ON public.documents FOR EACH ROW EXECUTE FUNCTION public.validate_document_upload_credits();


--
-- Name: activity_logs activity_logs_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: activity_logs activity_logs_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: ai_admin_settings ai_admin_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_admin_settings
    ADD CONSTRAINT ai_admin_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: ai_audit_logs ai_audit_logs_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_audit_logs
    ADD CONSTRAINT ai_audit_logs_version_id_fkey FOREIGN KEY (version_id) REFERENCES public.ai_change_versions(id);


--
-- Name: announcements announcements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: blocked_users blocked_users_blocked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_users
    ADD CONSTRAINT blocked_users_blocked_by_fkey FOREIGN KEY (blocked_by) REFERENCES auth.users(id);


--
-- Name: blocked_users blocked_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_users
    ADD CONSTRAINT blocked_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: document_tag_assignments document_tag_assignments_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_tag_assignments
    ADD CONSTRAINT document_tag_assignments_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: document_tag_assignments document_tag_assignments_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_tag_assignments
    ADD CONSTRAINT document_tag_assignments_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.document_tags(id) ON DELETE CASCADE;


--
-- Name: documents documents_assigned_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_assigned_staff_id_fkey FOREIGN KEY (assigned_staff_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: documents documents_magic_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_magic_link_id_fkey FOREIGN KEY (magic_link_id) REFERENCES public.magic_upload_links(id) ON DELETE SET NULL;


--
-- Name: documents documents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: email_logs email_logs_sent_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: email_settings email_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_settings
    ADD CONSTRAINT email_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: magic_upload_files magic_upload_files_magic_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_upload_files
    ADD CONSTRAINT magic_upload_files_magic_link_id_fkey FOREIGN KEY (magic_link_id) REFERENCES public.magic_upload_links(id) ON DELETE CASCADE;


--
-- Name: magic_upload_links magic_upload_links_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_upload_links
    ADD CONSTRAINT magic_upload_links_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: notification_reads notification_reads_notification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_reads
    ADD CONSTRAINT notification_reads_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: promo_code_uses promo_code_uses_promo_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_code_uses
    ADD CONSTRAINT promo_code_uses_promo_code_id_fkey FOREIGN KEY (promo_code_id) REFERENCES public.promo_codes(id) ON DELETE CASCADE;


--
-- Name: promo_code_uses promo_code_uses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_code_uses
    ADD CONSTRAINT promo_code_uses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: promo_codes promo_codes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT promo_codes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: support_tickets support_tickets_responded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_responded_by_fkey FOREIGN KEY (responded_by) REFERENCES auth.users(id);


--
-- Name: support_tickets support_tickets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: unmatched_reports unmatched_reports_matched_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unmatched_reports
    ADD CONSTRAINT unmatched_reports_matched_document_id_fkey FOREIGN KEY (matched_document_id) REFERENCES public.documents(id);


--
-- Name: unmatched_reports unmatched_reports_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unmatched_reports
    ADD CONSTRAINT unmatched_reports_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id);


--
-- Name: unmatched_reports unmatched_reports_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unmatched_reports
    ADD CONSTRAINT unmatched_reports_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id);


--
-- Name: usdt_audit_log usdt_audit_log_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usdt_audit_log
    ADD CONSTRAINT usdt_audit_log_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.usdt_trc20_payments(id);


--
-- Name: usdt_used_tx_hashes usdt_used_tx_hashes_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usdt_used_tx_hashes
    ADD CONSTRAINT usdt_used_tx_hashes_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.usdt_trc20_payments(id);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: documents Admin can delete documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can delete documents" ON public.documents FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: document_upload_notifications Admin can delete notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can delete notifications" ON public.document_upload_notifications FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_notifications Admin can delete user notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can delete user notifications" ON public.user_notifications FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: usdt_audit_log Admin can insert audit log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can insert audit log" ON public.usdt_audit_log FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: credit_transactions Admin can insert credit transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can insert credit transactions" ON public.credit_transactions FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_audit_logs Admin can manage AI audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage AI audit logs" ON public.ai_audit_logs USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_admin_settings Admin can manage AI settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage AI settings" ON public.ai_admin_settings USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_change_versions Admin can manage AI versions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage AI versions" ON public.ai_change_versions USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: support_tickets Admin can manage all tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage all tickets" ON public.support_tickets USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: announcements Admin can manage announcements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage announcements" ON public.announcements USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: blocked_users Admin can manage blocked users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage blocked users" ON public.blocked_users USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: magic_upload_links Admin can manage magic links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage magic links" ON public.magic_upload_links USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: manual_payments Admin can manage manual payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage manual payments" ON public.manual_payments USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: pricing_packages Admin can manage packages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage packages" ON public.pricing_packages USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: crypto_payments Admin can manage payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage payments" ON public.crypto_payments USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: promo_codes Admin can manage promo codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage promo codes" ON public.promo_codes USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admin can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: settings Admin can manage settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage settings" ON public.settings TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: staff_permissions Admin can manage staff permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage staff permissions" ON public.staff_permissions USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: staff_settings Admin can manage staff settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage staff settings" ON public.staff_settings USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: unmatched_reports Admin can manage unmatched reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage unmatched reports" ON public.unmatched_reports USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: usdt_wallet_counter Admin can manage wallet counter; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage wallet counter" ON public.usdt_wallet_counter USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: usdt_trc20_payments Admin can update USDT payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can update USDT payments" ON public.usdt_trc20_payments FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admin can update all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: usdt_trc20_payments Admin can view all USDT payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can view all USDT payments" ON public.usdt_trc20_payments FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: credit_transactions Admin can view all credit transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can view all credit transactions" ON public.credit_transactions FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: activity_logs Admin can view all logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can view all logs" ON public.activity_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: crypto_payments Admin can view all payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can view all payments" ON public.crypto_payments FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_notification_preferences Admin can view all preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can view all preferences" ON public.user_notification_preferences FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admin can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: promo_code_uses Admin can view all promo uses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can view all promo uses" ON public.promo_code_uses FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: push_notification_logs Admin can view all push notification logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can view all push notification logs" ON public.push_notification_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: referrals Admin can view all referrals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can view all referrals" ON public.referrals FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admin can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: usdt_audit_log Admin can view audit log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can view audit log" ON public.usdt_audit_log FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: magic_upload_files Admin can view magic upload files; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can view magic upload files" ON public.magic_upload_files USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: usdt_used_tx_hashes Admin can view tx hashes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can view tx hashes" ON public.usdt_used_tx_hashes FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: email_logs Admins can create email logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create email logs" ON public.email_logs FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: email_logs Admins can delete email logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete email logs" ON public.email_logs FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: email_settings Admins can manage email settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage email settings" ON public.email_settings USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: notifications Admins can manage notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage notifications" ON public.notifications TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: email_logs Admins can update email logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update email logs" ON public.email_logs FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: viva_payments Admins can view all viva payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all viva payments" ON public.viva_payments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: email_logs Admins can view email logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view email logs" ON public.email_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: magic_upload_links Anyone can increment upload count; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can increment upload count" ON public.magic_upload_links FOR UPDATE USING ((status = 'active'::text)) WITH CHECK ((status = 'active'::text));


--
-- Name: documents Anyone can insert documents with valid magic link; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert documents with valid magic link" ON public.documents FOR INSERT WITH CHECK (((magic_link_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.magic_upload_links
  WHERE ((magic_upload_links.id = documents.magic_link_id) AND (magic_upload_links.status = 'active'::text) AND ((magic_upload_links.expires_at IS NULL) OR (magic_upload_links.expires_at > now())) AND (magic_upload_links.current_uploads < magic_upload_links.max_uploads))))));


--
-- Name: magic_upload_files Anyone can insert magic upload files; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert magic upload files" ON public.magic_upload_files FOR INSERT WITH CHECK (true);


--
-- Name: magic_upload_links Anyone can validate active tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can validate active tokens" ON public.magic_upload_links FOR SELECT USING (((status = 'active'::text) AND ((expires_at IS NULL) OR (expires_at > now()))));


--
-- Name: documents Anyone can view documents via active magic link; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view documents via active magic link" ON public.documents FOR SELECT USING (((magic_link_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.magic_upload_links
  WHERE ((magic_upload_links.id = documents.magic_link_id) AND (magic_upload_links.status = 'active'::text) AND ((magic_upload_links.expires_at IS NULL) OR (magic_upload_links.expires_at > now())))))));


--
-- Name: magic_upload_files Anyone can view files via active magic link; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view files via active magic link" ON public.magic_upload_files FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.magic_upload_links
  WHERE ((magic_upload_links.id = magic_upload_files.magic_link_id) AND (magic_upload_links.status = 'active'::text) AND ((magic_upload_links.expires_at IS NULL) OR (magic_upload_links.expires_at > now()))))));


--
-- Name: promo_codes Authenticated users can validate promo codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can validate promo codes" ON public.promo_codes FOR SELECT USING (((auth.uid() IS NOT NULL) AND (is_active = true) AND ((valid_from IS NULL) OR (valid_from <= now())) AND ((valid_until IS NULL) OR (valid_until > now())) AND ((max_uses IS NULL) OR (current_uses < max_uses))));


--
-- Name: notifications Authenticated users can view active notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view active notifications" ON public.notifications FOR SELECT TO authenticated USING ((is_active = true));


--
-- Name: email_settings Authenticated users can view email settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view email settings" ON public.email_settings FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: settings Authenticated users can view settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view settings" ON public.settings FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: documents Customers can insert own documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can insert own documents" ON public.documents FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: documents Customers can view own documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can view own documents" ON public.documents FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: announcements Everyone can view active announcements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view active announcements" ON public.announcements FOR SELECT USING (((is_active = true) AND ((show_from IS NULL) OR (show_from <= now())) AND ((show_until IS NULL) OR (show_until > now()))));


--
-- Name: pricing_packages Everyone can view active packages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view active packages" ON public.pricing_packages FOR SELECT USING ((is_active = true));


--
-- Name: push_subscriptions Service role can read all subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can read all subscriptions" ON public.push_subscriptions FOR SELECT TO service_role USING (true);


--
-- Name: document_upload_notifications Staff and admin can view notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff and admin can view notifications" ON public.document_upload_notifications FOR SELECT USING ((public.has_role(auth.uid(), 'staff'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: activity_logs Staff can insert logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can insert logs" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'staff'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: unmatched_reports Staff can insert unmatched reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can insert unmatched reports" ON public.unmatched_reports FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'staff'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: documents Staff can update documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can update documents" ON public.documents FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'staff'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: documents Staff can view all documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view all documents" ON public.documents FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'staff'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: profiles Staff can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'staff'::public.app_role));


--
-- Name: staff_permissions Staff can view enabled permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view enabled permissions" ON public.staff_permissions FOR SELECT USING ((public.has_role(auth.uid(), 'staff'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: activity_logs Staff can view own logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view own logs" ON public.activity_logs FOR SELECT TO authenticated USING ((staff_id = auth.uid()));


--
-- Name: staff_settings Staff can view own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view own settings" ON public.staff_settings FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: unmatched_reports Staff can view unmatched reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view unmatched reports" ON public.unmatched_reports FOR SELECT USING (public.has_role(auth.uid(), 'staff'::public.app_role));


--
-- Name: user_notifications Staff/admin can insert user notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff/admin can insert user notifications" ON public.user_notifications FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'staff'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: usdt_trc20_payments System can insert USDT payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert USDT payments" ON public.usdt_trc20_payments FOR INSERT WITH CHECK (true);


--
-- Name: usdt_audit_log System can insert audit log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert audit log" ON public.usdt_audit_log FOR INSERT WITH CHECK (true);


--
-- Name: document_upload_notifications System can insert notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert notifications" ON public.document_upload_notifications FOR INSERT WITH CHECK (true);


--
-- Name: crypto_payments System can insert payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert payments" ON public.crypto_payments FOR INSERT WITH CHECK (true);


--
-- Name: push_notification_logs System can insert push notification logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert push notification logs" ON public.push_notification_logs FOR INSERT WITH CHECK (true);


--
-- Name: viva_payments System can insert viva payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert viva payments" ON public.viva_payments FOR INSERT WITH CHECK (true);


--
-- Name: usdt_payment_rate_limits System can manage rate limits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can manage rate limits" ON public.usdt_payment_rate_limits USING (true);


--
-- Name: usdt_used_tx_hashes System can manage tx hashes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can manage tx hashes" ON public.usdt_used_tx_hashes USING (true);


--
-- Name: usdt_trc20_payments System can update USDT payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can update USDT payments" ON public.usdt_trc20_payments FOR UPDATE USING (true);


--
-- Name: crypto_payments System can update payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can update payments" ON public.crypto_payments FOR UPDATE USING (true);


--
-- Name: push_notification_logs System can update push notification logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can update push notification logs" ON public.push_notification_logs FOR UPDATE USING (true);


--
-- Name: referrals System can update referrals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can update referrals" ON public.referrals FOR UPDATE USING (true);


--
-- Name: viva_payments System can update viva payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can update viva payments" ON public.viva_payments FOR UPDATE USING (true);


--
-- Name: usdt_trc20_payments Users can create USDT payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create USDT payments" ON public.usdt_trc20_payments FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: manual_payments Users can create manual payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create manual payments" ON public.manual_payments FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: referrals Users can create referral codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create referral codes" ON public.referrals FOR INSERT WITH CHECK ((referrer_id = auth.uid()));


--
-- Name: push_subscriptions Users can create their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own subscriptions" ON public.push_subscriptions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: support_tickets Users can create tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create tickets" ON public.support_tickets FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: push_subscriptions Users can delete their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own subscriptions" ON public.push_subscriptions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: credit_transactions Users can insert own credit transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own credit transactions" ON public.credit_transactions FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: user_notification_preferences Users can insert own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own preferences" ON public.user_notification_preferences FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: promo_code_uses Users can insert own promo use; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own promo use" ON public.promo_code_uses FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: document_tag_assignments Users can manage own document tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own document tags" ON public.document_tag_assignments USING ((EXISTS ( SELECT 1
   FROM public.documents d
  WHERE ((d.id = document_tag_assignments.document_id) AND (d.user_id = auth.uid())))));


--
-- Name: document_tags Users can manage own tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own tags" ON public.document_tags USING ((user_id = auth.uid()));


--
-- Name: notification_reads Users can mark notifications as read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can mark notifications as read" ON public.notification_reads FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_notification_preferences Users can update own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own preferences" ON public.user_notification_preferences FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((id = auth.uid()));


--
-- Name: user_notifications Users can update own user notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own user notifications" ON public.user_notifications FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: usdt_trc20_payments Users can view own USDT payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own USDT payments" ON public.usdt_trc20_payments FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: credit_transactions Users can view own credit transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own credit transactions" ON public.credit_transactions FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: manual_payments Users can view own manual payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own manual payments" ON public.manual_payments FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: crypto_payments Users can view own payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own payments" ON public.crypto_payments FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: user_notification_preferences Users can view own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own preferences" ON public.user_notification_preferences FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING ((id = auth.uid()));


--
-- Name: promo_code_uses Users can view own promo uses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own promo uses" ON public.promo_code_uses FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: referrals Users can view own referrals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own referrals" ON public.referrals FOR SELECT USING ((referrer_id = auth.uid()));


--
-- Name: user_roles Users can view own role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: support_tickets Users can view own tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own tickets" ON public.support_tickets FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_notifications Users can view own user notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own user notifications" ON public.user_notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: notification_reads Users can view their own notification reads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notification reads" ON public.notification_reads FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: push_subscriptions Users can view their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own subscriptions" ON public.push_subscriptions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: viva_payments Users can view their own viva payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own viva payments" ON public.viva_payments FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: activity_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_admin_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_admin_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_change_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_change_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: announcements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

--
-- Name: blocked_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

--
-- Name: credit_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: crypto_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.crypto_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: document_tag_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.document_tag_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: document_tags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.document_tags ENABLE ROW LEVEL SECURITY;

--
-- Name: document_upload_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.document_upload_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

--
-- Name: email_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: email_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: magic_upload_files; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.magic_upload_files ENABLE ROW LEVEL SECURITY;

--
-- Name: magic_upload_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.magic_upload_links ENABLE ROW LEVEL SECURITY;

--
-- Name: manual_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.manual_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_reads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: pricing_packages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pricing_packages ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: promo_code_uses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.promo_code_uses ENABLE ROW LEVEL SECURITY;

--
-- Name: promo_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: push_notification_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.push_notification_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: push_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: referrals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

--
-- Name: settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: support_tickets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

--
-- Name: unmatched_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.unmatched_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: usdt_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.usdt_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: usdt_payment_rate_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.usdt_payment_rate_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: usdt_trc20_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.usdt_trc20_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: usdt_used_tx_hashes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.usdt_used_tx_hashes ENABLE ROW LEVEL SECURITY;

--
-- Name: usdt_wallet_counter; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.usdt_wallet_counter ENABLE ROW LEVEL SECURITY;

--
-- Name: user_notification_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: user_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: viva_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.viva_payments ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;