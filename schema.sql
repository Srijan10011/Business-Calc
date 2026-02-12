--
-- PostgreSQL database dump
--

\restrict XD66oNLTiPxGFIXGCIcMW5ETG8qKXe2ucLpyYQdUs2fSOsVONFf4qpweIGBKLue

-- Dumped from database version 16.11 (Ubuntu 16.11-1.pgdg24.04+1)
-- Dumped by pg_dump version 16.11 (Ubuntu 16.11-1.pgdg24.04+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: srijanacharya22
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO srijanacharya22;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: srijanacharya22
--

COMMENT ON SCHEMA public IS '';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: srijanacharya22
--

CREATE TABLE public.accounts (
    account_id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_name text NOT NULL
);


ALTER TABLE public.accounts OWNER TO srijanacharya22;

--
-- Name: business_account; Type: TABLE; Schema: public; Owner: srijanacharya22
--

CREATE TABLE public.business_account (
    account_id uuid,
    business_id uuid,
    balance numeric(14,2) DEFAULT '0'::numeric NOT NULL
);


ALTER TABLE public.business_account OWNER TO srijanacharya22;

--
-- Name: business_customers; Type: TABLE; Schema: public; Owner: srijanacharya22
--

CREATE TABLE public.business_customers (
    customer_id uuid,
    business_id uuid
);


ALTER TABLE public.business_customers OWNER TO srijanacharya22;

--
-- Name: business_inventory; Type: TABLE; Schema: public; Owner: srijanacharya22
--

CREATE TABLE public.business_inventory (
    inventory_id uuid,
    business_id uuid
);


ALTER TABLE public.business_inventory OWNER TO srijanacharya22;

--
-- Name: business_transactions; Type: TABLE; Schema: public; Owner: srijanacharya22
--

CREATE TABLE public.business_transactions (
    transaction_id uuid,
    business_id uuid
);


ALTER TABLE public.business_transactions OWNER TO srijanacharya22;

--
-- Name: business_users; Type: TABLE; Schema: public; Owner: srijanacharya22
--

CREATE TABLE public.business_users (
    user_id uuid,
    business_id uuid,
    role text,
    role_id uuid
);


ALTER TABLE public.business_users OWNER TO srijanacharya22;

--
-- Name: businesses; Type: TABLE; Schema: public; Owner: srijanacharya22
--

CREATE TABLE public.businesses (
    business_id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    currency text DEFAULT 'INR'::text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.businesses OWNER TO srijanacharya22;

--
-- Name: cogs_account; Type: TABLE; Schema: public; Owner: srijanacharya22
--

CREATE TABLE public.cogs_account (
    account_id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid,
    balance numeric,
    business_id uuid
);


ALTER TABLE public.cogs_account OWNER TO srijanacharya22;

--
-- Name: cost_categories; Type: TABLE; Schema: public; Owner: srijanacharya22
--

CREATE TABLE public.cost_categories (
    category_id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text,
    type text,
    business_id uuid
);


ALTER TABLE public.cost_categories OWNER TO srijanacharya22;

--
-- Name: credit_payables; Type: TABLE; Schema: public; Owner: srijanacharya22
--

CREATE TABLE public.credit_payables (
    payable_id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    party_name text NOT NULL,
    total_amount numeric(14,2) NOT NULL,
    paid_amount numeric(14,2) DEFAULT 0,
    status text DEFAULT 'Pending'::text,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT credit_payables_status_check CHECK ((status = ANY (ARRAY['Pending'::text, 'Partial'::text, 'Paid'::text])))
);


ALTER TABLE public.credit_payables OWNER TO srijanacharya22;

--
-- Name: customer_purchase_history; Type: TABLE; Schema: public; Owner: srijanacharya22
--

CREATE TABLE public.customer_purchase_history (
    customer_id uuid,
    total_purchase numeric,
    outstanding_credit numeric,
    last_purchase timestamp without time zone
);


ALTER TABLE public.customer_purchase_history OWNER TO srijanacharya22;

--
-- Name: customers_info; Type: TABLE; Schema: public; Owner: srijanacharya22
--

CREATE TABLE public.customers_info (
    customer_id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    phone text,
    email text,
    created_at timestamp without time zone DEFAULT now(),
    address text
);


ALTER TABLE public.customers_info OWNER TO srijanacharya22;

--
-- Name: debit_account; Type: TABLE; Schema: public; Owner: srijanacharya22
--

CREATE TABLE public.debit_account (
    debit_id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    sale_id uuid,
    amount numeric,
    recovered numeric,
    total numeric,
    status text,
    CONSTRAINT debit_account_status_check CHECK ((status = ANY (ARRAY['Running'::text, 'closed'::text])))
);


ALTER TABLE public.debit_account OWNER TO srijanacharya22;

--
-- Name: fixed_cost_assets; Type: TABLE; Schema: public; Owner: srijanacharya22
--

CREATE TABLE public.fixed_cost_assets (
    asset_idd uuid DEFAULT gen_random_uuid() NOT NULL,
    cateogory_id uuid,
    total_cost numeric,
    recovered numeric
);


ALTER TABLE public.fixed_cost_assets OWNER TO srijanacharya22;

--
-- Name: inventory_info; Type: TABLE; Schema: public; Owner: srijanacharya22
--

CREATE TABLE public.inventory_info (
    inventory_id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text,
    stock numeric,
    type text,
    unit_cost numeric,
    CONSTRAINT inventory_info_type_check1 CHECK ((type = ANY (ARRAY['Raw_material'::text, 'Other'::text])))
);


ALTER TABLE public.inventory_info OWNER TO srijanacharya22;

--
-- Name: inventory_logs; Type: TABLE; Schema: public; Owner: srijanacharya22
--

CREATE TABLE public.inventory_logs (
    type text,
    amount numeric(14,2),
    previous_stock numeric(14,2),
    new_stock numeric(14,2),
    total_cost numeric(14,2),
    add_to_recover numeric(14,2),
    created_at timestamp without time zone DEFAULT now(),
    inventory_id uuid,
    CONSTRAINT inventory_info_type_check CHECK ((type = ANY (ARRAY['Incomming'::text, 'Outgoing'::text])))
);


ALTER TABLE public.inventory_logs OWNER TO srijanacharya22;

--
-- Name: materials; Type: TABLE; Schema: public; Owner: srijanacharya22
--

CREATE TABLE public.materials (
    material_id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    supplier text NOT NULL
);


ALTER TABLE public.materials OWNER TO srijanacharya22;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: srijanacharya22
--

CREATE TABLE public.payments (
    payment_id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    sale_id uuid,
    amount numeric
);


ALTER TABLE public.payments OWNER TO srijanacharya22;

--
-- Name: permissions; Type: TABLE; Schema: public; Owner: srijanacharya22
--

CREATE TABLE public.permissions (
    permission_id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid,
    permission_key character varying(100) NOT NULL,
    permission_name character varying(200) NOT NULL,
    category character varying(50) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.permissions OWNER TO srijanacharya22;

--
-- Name: product_cost_allocation; Type: TABLE; Schema: public; Owner: srijanacharya22
--

CREATE TABLE public.product_cost_allocation (
    allocation_id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    category_id uuid,
    amount_per_unit numeric
);


ALTER TABLE public.product_cost_allocation OWNER TO srijanacharya22;

--
-- Name: products; Type: TABLE; Schema: public; Owner: srijanacharya22
--

CREATE TABLE public.products (
    product_id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    price numeric(12,2) NOT NULL,
    stock integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.products OWNER TO srijanacharya22;

--
-- Name: products_business; Type: TABLE; Schema: public; Owner: srijanacharya22
--

CREATE TABLE public.products_business (
    product_id uuid,
    business_id uuid
);


ALTER TABLE public.products_business OWNER TO srijanacharya22;

--
-- Name: purchases; Type: TABLE; Schema: public; Owner: srijanacharya22
--

CREATE TABLE public.purchases (
    purchase_id uuid DEFAULT gen_random_uuid() NOT NULL,
    material_id uuid,
    quantity numeric(14,2) DEFAULT '0'::numeric NOT NULL,
    rate numeric(14,2) NOT NULL,
    total numeric(14,2) NOT NULL,
    type text,
    CONSTRAINT purchases_type_check CHECK ((type = ANY (ARRAY['Bank'::text, 'Cash'::text, 'credit'::text])))
);


ALTER TABLE public.purchases OWNER TO srijanacharya22;

--
-- Name: removed_products; Type: TABLE; Schema: public; Owner: srijanacharya22
--

CREATE TABLE public.removed_products (
    removed_product_id uuid DEFAULT gen_random_uuid() NOT NULL,
    original_product_id uuid NOT NULL,
    product_name text NOT NULL,
    original_price numeric(12,2) NOT NULL,
    business_id uuid NOT NULL,
    total_quantity_sold numeric(14,2) DEFAULT 0,
    total_revenue numeric(15,2) DEFAULT 0.00,
    final_stock_quantity integer DEFAULT 0,
    created_at timestamp without time zone NOT NULL,
    removed_at timestamp without time zone DEFAULT now(),
    removed_by uuid,
    removal_reason text,
    total_sales_count integer DEFAULT 0,
    last_sale_date timestamp without time zone
);


ALTER TABLE public.removed_products OWNER TO srijanacharya22;

--
-- Name: TABLE removed_products; Type: COMMENT; Schema: public; Owner: srijanacharya22
--

COMMENT ON TABLE public.removed_products IS 'Stores historical data of deleted products for audit and analytics';


--
-- Name: COLUMN removed_products.original_product_id; Type: COMMENT; Schema: public; Owner: srijanacharya22
--

COMMENT ON COLUMN public.removed_products.original_product_id IS 'The UUID of the product before deletion';


--
-- Name: COLUMN removed_products.total_quantity_sold; Type: COMMENT; Schema: public; Owner: srijanacharya22
--

COMMENT ON COLUMN public.removed_products.total_quantity_sold IS 'Total quantity sold during product lifetime';


--
-- Name: COLUMN removed_products.total_revenue; Type: COMMENT; Schema: public; Owner: srijanacharya22
--

COMMENT ON COLUMN public.removed_products.total_revenue IS 'Total revenue generated during product lifetime';


--
-- Name: COLUMN removed_products.final_stock_quantity; Type: COMMENT; Schema: public; Owner: srijanacharya22
--

COMMENT ON COLUMN public.removed_products.final_stock_quantity IS 'Remaining stock at time of deletion';


--
-- Name: COLUMN removed_products.created_at; Type: COMMENT; Schema: public; Owner: srijanacharya22
--

COMMENT ON COLUMN public.removed_products.created_at IS 'Original product creation timestamp';


--
-- Name: COLUMN removed_products.removed_at; Type: COMMENT; Schema: public; Owner: srijanacharya22
--

COMMENT ON COLUMN public.removed_products.removed_at IS 'Timestamp when product was deleted';


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: srijanacharya22
--

CREATE TABLE public.role_permissions (
    role_permission_id uuid DEFAULT gen_random_uuid() NOT NULL,
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.role_permissions OWNER TO srijanacharya22;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: srijanacharya22
--

CREATE TABLE public.roles (
    role_id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    role_name character varying(100) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.roles OWNER TO srijanacharya22;

--
-- Name: salary_distribution_settings; Type: TABLE; Schema: public; Owner: srijanacharya22
--

CREATE TABLE public.salary_distribution_settings (
    setting_id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    distribution_mode character varying(20) DEFAULT 'manual'::character varying,
    distribution_day integer DEFAULT 1,
    last_distribution_month character varying(7),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT salary_distribution_settings_distribution_day_check CHECK (((distribution_day >= 1) AND (distribution_day <= 28))),
    CONSTRAINT salary_distribution_settings_distribution_mode_check CHECK (((distribution_mode)::text = ANY ((ARRAY['manual'::character varying, 'automatic'::character varying])::text[])))
);


ALTER TABLE public.salary_distribution_settings OWNER TO srijanacharya22;

--
-- Name: salary_transactions; Type: TABLE; Schema: public; Owner: srijanacharya22
--

CREATE TABLE public.salary_transactions (
    transaction_id uuid DEFAULT gen_random_uuid() NOT NULL,
    member_id uuid NOT NULL,
    amount numeric(15,2) NOT NULL,
    transaction_type character varying(20) DEFAULT 'salary_credit'::character varying,
    distribution_month character varying(7) NOT NULL,
    status character varying(20) DEFAULT 'completed'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT salary_transactions_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'failed'::character varying])::text[]))),
    CONSTRAINT salary_transactions_transaction_type_check CHECK (((transaction_type)::text = ANY ((ARRAY['salary_credit'::character varying, 'withdrawal'::character varying, 'adjustment'::character varying])::text[])))
);


ALTER TABLE public.salary_transactions OWNER TO srijanacharya22;

--
-- Name: sales; Type: TABLE; Schema: public; Owner: srijanacharya22
--

CREATE TABLE public.sales (
    sale_id uuid,
    business_id uuid,
    customer_id uuid
);


ALTER TABLE public.sales OWNER TO srijanacharya22;

--
-- Name: sales_info; Type: TABLE; Schema: public; Owner: srijanacharya22
--

CREATE TABLE public.sales_info (
    sale_id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    quantity numeric(14,2) NOT NULL,
    rate numeric NOT NULL,
    total_amount numeric(14,2) NOT NULL,
    account_id uuid,
    type text,
    status text,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT sales_info_status_check CHECK ((status = ANY (ARRAY['Pending'::text, 'Paid'::text]))),
    CONSTRAINT sales_info_type_check CHECK ((type = ANY (ARRAY['Cash'::text, 'bank'::text, 'debit'::text])))
);


ALTER TABLE public.sales_info OWNER TO srijanacharya22;

--
-- Name: team_accounts; Type: TABLE; Schema: public; Owner: srijanacharya22
--

CREATE TABLE public.team_accounts (
    account_id uuid DEFAULT gen_random_uuid() NOT NULL,
    member_id uuid NOT NULL,
    current_balance numeric(15,2) DEFAULT 0.00,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.team_accounts OWNER TO srijanacharya22;

--
-- Name: team_members; Type: TABLE; Schema: public; Owner: srijanacharya22
--

CREATE TABLE public.team_members (
    member_id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(100),
    phone character varying(20),
    "position" character varying(100),
    department character varying(50),
    salary numeric(10,2),
    enroll_date date DEFAULT CURRENT_DATE NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT team_members_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'terminated'::character varying])::text[])))
);


ALTER TABLE public.team_members OWNER TO srijanacharya22;

--
-- Name: transactions; Type: TABLE; Schema: public; Owner: srijanacharya22
--

CREATE TABLE public.transactions (
    transaction_id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid,
    amount numeric,
    type text,
    note text,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT transactions_type_check CHECK ((type = ANY (ARRAY['Incomming'::text, 'Outgoing'::text, 'Transfer'::text])))
);


ALTER TABLE public.transactions OWNER TO srijanacharya22;

--
-- Name: user_requests; Type: TABLE; Schema: public; Owner: srijanacharya22
--

CREATE TABLE public.user_requests (
    request_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    business_id uuid,
    status character varying(20) DEFAULT 'pending'::character varying,
    requested_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_requests_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);


ALTER TABLE public.user_requests OWNER TO srijanacharya22;

--
-- Name: users; Type: TABLE; Schema: public; Owner: srijanacharya22
--

CREATE TABLE public.users (
    user_id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO srijanacharya22;

--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (account_id);


--
-- Name: businesses businesses_pkey; Type: CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_pkey PRIMARY KEY (business_id);


--
-- Name: cogs_account cogs_account_pkey; Type: CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.cogs_account
    ADD CONSTRAINT cogs_account_pkey PRIMARY KEY (account_id);


--
-- Name: cost_categories cost_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.cost_categories
    ADD CONSTRAINT cost_categories_pkey PRIMARY KEY (category_id);


--
-- Name: credit_payables credit_payables_pkey; Type: CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.credit_payables
    ADD CONSTRAINT credit_payables_pkey PRIMARY KEY (payable_id);


--
-- Name: customers_info customers_info_pkey; Type: CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.customers_info
    ADD CONSTRAINT customers_info_pkey PRIMARY KEY (customer_id);


--
-- Name: debit_account debit_account_pkey; Type: CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.debit_account
    ADD CONSTRAINT debit_account_pkey PRIMARY KEY (debit_id);


--
-- Name: fixed_cost_assets fixed_cost_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.fixed_cost_assets
    ADD CONSTRAINT fixed_cost_assets_pkey PRIMARY KEY (asset_idd);


--
-- Name: inventory_info inventory_info_pkey1; Type: CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.inventory_info
    ADD CONSTRAINT inventory_info_pkey1 PRIMARY KEY (inventory_id);


--
-- Name: materials materials_pkey; Type: CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_pkey PRIMARY KEY (material_id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (payment_id);


--
-- Name: permissions permissions_business_id_permission_key_key; Type: CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_business_id_permission_key_key UNIQUE (business_id, permission_key);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (permission_id);


--
-- Name: product_cost_allocation product_cost_allocation_pkey; Type: CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.product_cost_allocation
    ADD CONSTRAINT product_cost_allocation_pkey PRIMARY KEY (allocation_id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (product_id);


--
-- Name: purchases purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_pkey PRIMARY KEY (purchase_id);


--
-- Name: removed_products removed_products_pkey; Type: CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.removed_products
    ADD CONSTRAINT removed_products_pkey PRIMARY KEY (removed_product_id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_permission_id);


--
-- Name: role_permissions role_permissions_role_id_permission_id_key; Type: CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_permission_id_key UNIQUE (role_id, permission_id);


--
-- Name: roles roles_business_id_role_name_key; Type: CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_business_id_role_name_key UNIQUE (business_id, role_name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (role_id);


--
-- Name: salary_distribution_settings salary_distribution_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.salary_distribution_settings
    ADD CONSTRAINT salary_distribution_settings_pkey PRIMARY KEY (setting_id);


--
-- Name: salary_transactions salary_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.salary_transactions
    ADD CONSTRAINT salary_transactions_pkey PRIMARY KEY (transaction_id);


--
-- Name: sales_info sales_info_pkey; Type: CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.sales_info
    ADD CONSTRAINT sales_info_pkey PRIMARY KEY (sale_id);


--
-- Name: team_accounts team_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.team_accounts
    ADD CONSTRAINT team_accounts_pkey PRIMARY KEY (account_id);


--
-- Name: team_members team_members_email_key; Type: CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_email_key UNIQUE (email);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (member_id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (transaction_id);


--
-- Name: user_requests user_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.user_requests
    ADD CONSTRAINT user_requests_pkey PRIMARY KEY (request_id);


--
-- Name: user_requests user_requests_user_id_business_id_key; Type: CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.user_requests
    ADD CONSTRAINT user_requests_user_id_business_id_key UNIQUE (user_id, business_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: idx_business_users_role; Type: INDEX; Schema: public; Owner: srijanacharya22
--

CREATE INDEX idx_business_users_role ON public.business_users USING btree (role_id);


--
-- Name: idx_permissions_business; Type: INDEX; Schema: public; Owner: srijanacharya22
--

CREATE INDEX idx_permissions_business ON public.permissions USING btree (business_id);


--
-- Name: idx_removed_products_business_id; Type: INDEX; Schema: public; Owner: srijanacharya22
--

CREATE INDEX idx_removed_products_business_id ON public.removed_products USING btree (business_id);


--
-- Name: idx_removed_products_business_removed; Type: INDEX; Schema: public; Owner: srijanacharya22
--

CREATE INDEX idx_removed_products_business_removed ON public.removed_products USING btree (business_id, removed_at);


--
-- Name: idx_removed_products_original_id; Type: INDEX; Schema: public; Owner: srijanacharya22
--

CREATE INDEX idx_removed_products_original_id ON public.removed_products USING btree (original_product_id);


--
-- Name: idx_removed_products_removed_at; Type: INDEX; Schema: public; Owner: srijanacharya22
--

CREATE INDEX idx_removed_products_removed_at ON public.removed_products USING btree (removed_at);


--
-- Name: idx_role_permissions_permission; Type: INDEX; Schema: public; Owner: srijanacharya22
--

CREATE INDEX idx_role_permissions_permission ON public.role_permissions USING btree (permission_id);


--
-- Name: idx_role_permissions_role; Type: INDEX; Schema: public; Owner: srijanacharya22
--

CREATE INDEX idx_role_permissions_role ON public.role_permissions USING btree (role_id);


--
-- Name: idx_roles_business; Type: INDEX; Schema: public; Owner: srijanacharya22
--

CREATE INDEX idx_roles_business ON public.roles USING btree (business_id);


--
-- Name: idx_salary_distribution_business_id; Type: INDEX; Schema: public; Owner: srijanacharya22
--

CREATE INDEX idx_salary_distribution_business_id ON public.salary_distribution_settings USING btree (business_id);


--
-- Name: idx_salary_transactions_member_id; Type: INDEX; Schema: public; Owner: srijanacharya22
--

CREATE INDEX idx_salary_transactions_member_id ON public.salary_transactions USING btree (member_id);


--
-- Name: idx_salary_transactions_month; Type: INDEX; Schema: public; Owner: srijanacharya22
--

CREATE INDEX idx_salary_transactions_month ON public.salary_transactions USING btree (distribution_month);


--
-- Name: idx_team_accounts_member_id; Type: INDEX; Schema: public; Owner: srijanacharya22
--

CREATE INDEX idx_team_accounts_member_id ON public.team_accounts USING btree (member_id);


--
-- Name: idx_team_members_business_id; Type: INDEX; Schema: public; Owner: srijanacharya22
--

CREATE INDEX idx_team_members_business_id ON public.team_members USING btree (business_id);


--
-- Name: idx_team_members_status; Type: INDEX; Schema: public; Owner: srijanacharya22
--

CREATE INDEX idx_team_members_status ON public.team_members USING btree (status);


--
-- Name: business_account business_account_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.business_account
    ADD CONSTRAINT business_account_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(account_id);


--
-- Name: business_account business_account_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.business_account
    ADD CONSTRAINT business_account_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(business_id);


--
-- Name: business_customers business_customers_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.business_customers
    ADD CONSTRAINT business_customers_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(business_id) ON DELETE CASCADE;


--
-- Name: business_customers business_customers_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.business_customers
    ADD CONSTRAINT business_customers_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers_info(customer_id) ON DELETE CASCADE;


--
-- Name: business_inventory business_inventory_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.business_inventory
    ADD CONSTRAINT business_inventory_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(business_id);


--
-- Name: business_inventory business_inventory_inventory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.business_inventory
    ADD CONSTRAINT business_inventory_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES public.inventory_info(inventory_id);


--
-- Name: business_transactions business_transactions_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.business_transactions
    ADD CONSTRAINT business_transactions_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(business_id);


--
-- Name: business_transactions business_transactions_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.business_transactions
    ADD CONSTRAINT business_transactions_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(transaction_id);


--
-- Name: business_users business_users_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.business_users
    ADD CONSTRAINT business_users_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(business_id);


--
-- Name: business_users business_users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.business_users
    ADD CONSTRAINT business_users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(role_id) ON DELETE SET NULL;


--
-- Name: business_users business_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.business_users
    ADD CONSTRAINT business_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: cogs_account cogs_account_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.cogs_account
    ADD CONSTRAINT cogs_account_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(business_id);


--
-- Name: cogs_account cogs_account_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.cogs_account
    ADD CONSTRAINT cogs_account_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.cost_categories(category_id);


--
-- Name: cost_categories cost_categories_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.cost_categories
    ADD CONSTRAINT cost_categories_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(business_id);


--
-- Name: credit_payables credit_payables_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.credit_payables
    ADD CONSTRAINT credit_payables_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(business_id);


--
-- Name: customer_purchase_history customer_purchase_history_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.customer_purchase_history
    ADD CONSTRAINT customer_purchase_history_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers_info(customer_id);


--
-- Name: debit_account debit_account_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.debit_account
    ADD CONSTRAINT debit_account_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers_info(customer_id);


--
-- Name: debit_account debit_account_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.debit_account
    ADD CONSTRAINT debit_account_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales_info(sale_id);


--
-- Name: fixed_cost_assets fixed_cost_assets_cateogory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.fixed_cost_assets
    ADD CONSTRAINT fixed_cost_assets_cateogory_id_fkey FOREIGN KEY (cateogory_id) REFERENCES public.cost_categories(category_id);


--
-- Name: removed_products fk_removed_products_business; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.removed_products
    ADD CONSTRAINT fk_removed_products_business FOREIGN KEY (business_id) REFERENCES public.businesses(business_id) ON DELETE CASCADE;


--
-- Name: removed_products fk_removed_products_user; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.removed_products
    ADD CONSTRAINT fk_removed_products_user FOREIGN KEY (removed_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: inventory_logs inventory_logs_inventory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.inventory_logs
    ADD CONSTRAINT inventory_logs_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES public.inventory_info(inventory_id);


--
-- Name: payments payments_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers_info(customer_id);


--
-- Name: payments payments_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales_info(sale_id);


--
-- Name: permissions permissions_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(business_id) ON DELETE CASCADE;


--
-- Name: product_cost_allocation product_cost_allocation_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.product_cost_allocation
    ADD CONSTRAINT product_cost_allocation_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.cost_categories(category_id);


--
-- Name: product_cost_allocation product_cost_allocation_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.product_cost_allocation
    ADD CONSTRAINT product_cost_allocation_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id);


--
-- Name: products_business products_business_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.products_business
    ADD CONSTRAINT products_business_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(business_id) ON DELETE CASCADE;


--
-- Name: products_business products_business_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.products_business
    ADD CONSTRAINT products_business_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id);


--
-- Name: purchases purchases_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(material_id);


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(permission_id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(role_id) ON DELETE CASCADE;


--
-- Name: roles roles_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(business_id) ON DELETE CASCADE;


--
-- Name: salary_distribution_settings salary_distribution_settings_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.salary_distribution_settings
    ADD CONSTRAINT salary_distribution_settings_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(business_id) ON DELETE CASCADE;


--
-- Name: salary_transactions salary_transactions_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.salary_transactions
    ADD CONSTRAINT salary_transactions_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.team_members(member_id) ON DELETE CASCADE;


--
-- Name: sales sales_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(business_id);


--
-- Name: sales sales_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers_info(customer_id);


--
-- Name: sales_info sales_info_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.sales_info
    ADD CONSTRAINT sales_info_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(account_id);


--
-- Name: sales_info sales_info_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.sales_info
    ADD CONSTRAINT sales_info_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE CASCADE;


--
-- Name: sales sales_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales_info(sale_id);


--
-- Name: team_accounts team_accounts_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.team_accounts
    ADD CONSTRAINT team_accounts_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.team_members(member_id) ON DELETE CASCADE;


--
-- Name: team_members team_members_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(business_id) ON DELETE CASCADE;


--
-- Name: transactions transactions_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(account_id);


--
-- Name: user_requests user_requests_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.user_requests
    ADD CONSTRAINT user_requests_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(business_id) ON DELETE CASCADE;


--
-- Name: user_requests user_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srijanacharya22
--

ALTER TABLE ONLY public.user_requests
    ADD CONSTRAINT user_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: srijanacharya22
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict XD66oNLTiPxGFIXGCIcMW5ETG8qKXe2ucLpyYQdUs2fSOsVONFf4qpweIGBKLue

