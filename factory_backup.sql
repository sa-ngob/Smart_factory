--
-- PostgreSQL database dump
--

\restrict wztF5XAItHjEfbXIXfzcjHy1f5cH6yAg25II5Hswbu0VLmK0azMjlobQVrfLp5N

-- Dumped from database version 15.15 (Debian 15.15-1.pgdg13+1)
-- Dumped by pg_dump version 15.15 (Debian 15.15-1.pgdg13+1)

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

ALTER TABLE IF EXISTS ONLY public.sales_orders DROP CONSTRAINT IF EXISTS sales_orders_customer_id_fkey;
ALTER TABLE IF EXISTS ONLY public.sales_orders DROP CONSTRAINT IF EXISTS sales_orders_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.sales_order_items DROP CONSTRAINT IF EXISTS sales_order_items_so_id_fkey;
ALTER TABLE IF EXISTS ONLY public.role_pages DROP CONSTRAINT IF EXISTS role_pages_role_id_fkey;
ALTER TABLE IF EXISTS ONLY public.role_pages DROP CONSTRAINT IF EXISTS role_pages_page_id_fkey;
ALTER TABLE IF EXISTS ONLY public.production_records DROP CONSTRAINT IF EXISTS production_records_mo_id_fkey;
ALTER TABLE IF EXISTS ONLY public.molds DROP CONSTRAINT IF EXISTS molds_customer_id_fkey;
ALTER TABLE IF EXISTS ONLY public.mold_parts DROP CONSTRAINT IF EXISTS mold_parts_mold_id_fkey;
ALTER TABLE IF EXISTS ONLY public.manufacturing_orders DROP CONSTRAINT IF EXISTS manufacturing_orders_so_id_fkey;
ALTER TABLE IF EXISTS ONLY public.manufacturing_orders DROP CONSTRAINT IF EXISTS manufacturing_orders_bom_id_fkey;
ALTER TABLE IF EXISTS ONLY public.machine_status_logs DROP CONSTRAINT IF EXISTS machine_status_logs_reason_id_fkey;
ALTER TABLE IF EXISTS ONLY public.machine_status_logs DROP CONSTRAINT IF EXISTS machine_status_logs_machine_id_fkey;
ALTER TABLE IF EXISTS ONLY public.entity_roles DROP CONSTRAINT IF EXISTS entity_roles_entity_id_fkey;
ALTER TABLE IF EXISTS ONLY public.boms DROP CONSTRAINT IF EXISTS boms_mold_id_fkey;
ALTER TABLE IF EXISTS ONLY public.bom_items DROP CONSTRAINT IF EXISTS bom_items_bom_id_fkey;
DROP INDEX IF EXISTS public.idx_status_logs_machine_time;
DROP INDEX IF EXISTS public."IDX_session_expire";
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE IF EXISTS ONLY public.session DROP CONSTRAINT IF EXISTS session_pkey;
ALTER TABLE IF EXISTS ONLY public.sales_orders DROP CONSTRAINT IF EXISTS sales_orders_so_number_key;
ALTER TABLE IF EXISTS ONLY public.sales_orders DROP CONSTRAINT IF EXISTS sales_orders_pkey;
ALTER TABLE IF EXISTS ONLY public.sales_order_items DROP CONSTRAINT IF EXISTS sales_order_items_pkey;
ALTER TABLE IF EXISTS ONLY public.roles DROP CONSTRAINT IF EXISTS roles_pkey;
ALTER TABLE IF EXISTS ONLY public.roles DROP CONSTRAINT IF EXISTS roles_name_key;
ALTER TABLE IF EXISTS ONLY public.role_pages DROP CONSTRAINT IF EXISTS role_pages_pkey;
ALTER TABLE IF EXISTS ONLY public.production_records DROP CONSTRAINT IF EXISTS production_records_pkey;
ALTER TABLE IF EXISTS ONLY public.pages DROP CONSTRAINT IF EXISTS pages_url_key;
ALTER TABLE IF EXISTS ONLY public.pages DROP CONSTRAINT IF EXISTS pages_pkey;
ALTER TABLE IF EXISTS ONLY public.pages DROP CONSTRAINT IF EXISTS pages_name_key;
ALTER TABLE IF EXISTS ONLY public.molds DROP CONSTRAINT IF EXISTS molds_pkey;
ALTER TABLE IF EXISTS ONLY public.molds DROP CONSTRAINT IF EXISTS molds_mold_code_key;
ALTER TABLE IF EXISTS ONLY public.mold_parts DROP CONSTRAINT IF EXISTS mold_parts_pkey;
ALTER TABLE IF EXISTS ONLY public.manufacturing_orders DROP CONSTRAINT IF EXISTS manufacturing_orders_pkey;
ALTER TABLE IF EXISTS ONLY public.manufacturing_orders DROP CONSTRAINT IF EXISTS manufacturing_orders_mo_number_key;
ALTER TABLE IF EXISTS ONLY public.machines DROP CONSTRAINT IF EXISTS machines_pkey;
ALTER TABLE IF EXISTS ONLY public.machines DROP CONSTRAINT IF EXISTS machines_machine_code_key;
ALTER TABLE IF EXISTS ONLY public.machine_status_logs DROP CONSTRAINT IF EXISTS machine_status_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.machine_data DROP CONSTRAINT IF EXISTS machine_data_pkey;
ALTER TABLE IF EXISTS ONLY public.items DROP CONSTRAINT IF EXISTS items_pkey;
ALTER TABLE IF EXISTS ONLY public.items DROP CONSTRAINT IF EXISTS items_item_code_key;
ALTER TABLE IF EXISTS ONLY public.item_vendors DROP CONSTRAINT IF EXISTS item_vendors_pkey;
ALTER TABLE IF EXISTS ONLY public.inventory_transactions DROP CONSTRAINT IF EXISTS inventory_transactions_pkey;
ALTER TABLE IF EXISTS ONLY public.entity_roles DROP CONSTRAINT IF EXISTS entity_roles_pkey;
ALTER TABLE IF EXISTS ONLY public.entities DROP CONSTRAINT IF EXISTS entities_pkey;
ALTER TABLE IF EXISTS ONLY public.entities DROP CONSTRAINT IF EXISTS entities_entity_code_key;
ALTER TABLE IF EXISTS ONLY public.downtime_reasons DROP CONSTRAINT IF EXISTS downtime_reasons_reason_code_key;
ALTER TABLE IF EXISTS ONLY public.downtime_reasons DROP CONSTRAINT IF EXISTS downtime_reasons_pkey;
ALTER TABLE IF EXISTS ONLY public.defect_codes DROP CONSTRAINT IF EXISTS defect_codes_pkey;
ALTER TABLE IF EXISTS ONLY public.defect_codes DROP CONSTRAINT IF EXISTS defect_codes_code_key;
ALTER TABLE IF EXISTS ONLY public.boms DROP CONSTRAINT IF EXISTS boms_pkey;
ALTER TABLE IF EXISTS ONLY public.bom_items DROP CONSTRAINT IF EXISTS bom_items_pkey;
ALTER TABLE IF EXISTS public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.sales_orders ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.sales_order_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.roles ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.production_records ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.pages ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.molds ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.mold_parts ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.manufacturing_orders ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.machines ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.machine_status_logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.inventory_transactions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.entities ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.downtime_reasons ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.defect_codes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.boms ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.bom_items ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.users_id_seq;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.session;
DROP SEQUENCE IF EXISTS public.sales_orders_id_seq;
DROP TABLE IF EXISTS public.sales_orders;
DROP SEQUENCE IF EXISTS public.sales_order_items_id_seq;
DROP TABLE IF EXISTS public.sales_order_items;
DROP SEQUENCE IF EXISTS public.roles_id_seq;
DROP TABLE IF EXISTS public.roles;
DROP TABLE IF EXISTS public.role_pages;
DROP SEQUENCE IF EXISTS public.production_records_id_seq;
DROP TABLE IF EXISTS public.production_records;
DROP SEQUENCE IF EXISTS public.pages_id_seq;
DROP TABLE IF EXISTS public.pages;
DROP SEQUENCE IF EXISTS public.molds_id_seq;
DROP TABLE IF EXISTS public.molds;
DROP SEQUENCE IF EXISTS public.mold_parts_id_seq;
DROP TABLE IF EXISTS public.mold_parts;
DROP SEQUENCE IF EXISTS public.manufacturing_orders_id_seq;
DROP TABLE IF EXISTS public.manufacturing_orders;
DROP SEQUENCE IF EXISTS public.machines_id_seq;
DROP TABLE IF EXISTS public.machines;
DROP SEQUENCE IF EXISTS public.machine_status_logs_id_seq;
DROP TABLE IF EXISTS public.machine_status_logs;
DROP TABLE IF EXISTS public.machine_data;
DROP SEQUENCE IF EXISTS public.items_id_seq;
DROP TABLE IF EXISTS public.items;
DROP TABLE IF EXISTS public.item_vendors;
DROP SEQUENCE IF EXISTS public.inventory_transactions_id_seq;
DROP TABLE IF EXISTS public.inventory_transactions;
DROP TABLE IF EXISTS public.entity_roles;
DROP SEQUENCE IF EXISTS public.entities_id_seq;
DROP TABLE IF EXISTS public.entities;
DROP SEQUENCE IF EXISTS public.downtime_reasons_id_seq;
DROP TABLE IF EXISTS public.downtime_reasons;
DROP SEQUENCE IF EXISTS public.defect_codes_id_seq;
DROP TABLE IF EXISTS public.defect_codes;
DROP SEQUENCE IF EXISTS public.boms_id_seq;
DROP TABLE IF EXISTS public.boms;
DROP SEQUENCE IF EXISTS public.bom_items_id_seq;
DROP TABLE IF EXISTS public.bom_items;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bom_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bom_items (
    id integer NOT NULL,
    bom_id integer NOT NULL,
    material_code character varying(50) NOT NULL,
    material_name character varying(255),
    mixing_ratio real,
    unit character varying(20)
);


ALTER TABLE public.bom_items OWNER TO postgres;

--
-- Name: bom_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bom_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.bom_items_id_seq OWNER TO postgres;

--
-- Name: bom_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bom_items_id_seq OWNED BY public.bom_items.id;


--
-- Name: boms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.boms (
    id integer NOT NULL,
    product_part_number character varying(50) NOT NULL,
    product_name character varying(255),
    mold_id integer,
    creation_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    version integer DEFAULT 1,
    is_active integer DEFAULT 1
);


ALTER TABLE public.boms OWNER TO postgres;

--
-- Name: boms_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.boms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.boms_id_seq OWNER TO postgres;

--
-- Name: boms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.boms_id_seq OWNED BY public.boms.id;


--
-- Name: defect_codes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.defect_codes (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    description text NOT NULL
);


ALTER TABLE public.defect_codes OWNER TO postgres;

--
-- Name: defect_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.defect_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.defect_codes_id_seq OWNER TO postgres;

--
-- Name: defect_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.defect_codes_id_seq OWNED BY public.defect_codes.id;


--
-- Name: downtime_reasons; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.downtime_reasons (
    id integer NOT NULL,
    reason_code character varying(50) NOT NULL,
    description text NOT NULL,
    category character varying(50)
);


ALTER TABLE public.downtime_reasons OWNER TO postgres;

--
-- Name: downtime_reasons_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.downtime_reasons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.downtime_reasons_id_seq OWNER TO postgres;

--
-- Name: downtime_reasons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.downtime_reasons_id_seq OWNED BY public.downtime_reasons.id;


--
-- Name: entities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.entities (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    tax_id character varying(50),
    address text,
    branch_code character varying(50),
    branch_name character varying(255),
    contact_person character varying(255),
    email character varying(255),
    phone character varying(50),
    is_customer integer DEFAULT 0,
    is_vendor integer DEFAULT 0,
    entity_code character varying(50)
);


ALTER TABLE public.entities OWNER TO postgres;

--
-- Name: entities_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.entities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.entities_id_seq OWNER TO postgres;

--
-- Name: entities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.entities_id_seq OWNED BY public.entities.id;


--
-- Name: entity_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.entity_roles (
    entity_id integer NOT NULL,
    role_name character varying(50) NOT NULL
);


ALTER TABLE public.entity_roles OWNER TO postgres;

--
-- Name: inventory_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_transactions (
    id integer NOT NULL,
    transaction_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    item_code character varying(50) NOT NULL,
    transaction_type character varying(50) NOT NULL,
    quantity_change integer NOT NULL,
    new_quantity integer,
    reference_type character varying(50),
    reference_id character varying(50),
    notes text,
    created_by character varying(100)
);


ALTER TABLE public.inventory_transactions OWNER TO postgres;

--
-- Name: inventory_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventory_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.inventory_transactions_id_seq OWNER TO postgres;

--
-- Name: inventory_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventory_transactions_id_seq OWNED BY public.inventory_transactions.id;


--
-- Name: item_vendors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.item_vendors (
    item_id integer NOT NULL,
    vendor_id integer NOT NULL
);


ALTER TABLE public.item_vendors OWNER TO postgres;

--
-- Name: items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.items (
    id integer NOT NULL,
    item_code character varying(50) NOT NULL,
    item_name character varying(255) NOT NULL,
    item_type character varying(50),
    uom character varying(20),
    stock_quantity integer DEFAULT 0,
    status character varying(20),
    cycle_time_sec real,
    material_dry_temp real,
    customer_id integer,
    model character varying(255),
    material_name character varying(255),
    grade character varying(100),
    colour character varying(100),
    part_weight_gram real,
    image_path text
);


ALTER TABLE public.items OWNER TO postgres;

--
-- Name: items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.items_id_seq OWNER TO postgres;

--
-- Name: items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.items_id_seq OWNED BY public.items.id;


--
-- Name: machine_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.machine_data (
    machine_id character varying(50) NOT NULL,
    "timestamp" timestamp without time zone NOT NULL,
    mold_count integer,
    machine_status integer,
    mold_temp_core real,
    mold_temp_cavity real,
    mo_number character varying(50),
    cycle_time_sec real,
    material_dry_temp real,
    item_name character varying(255)
);


ALTER TABLE public.machine_data OWNER TO postgres;

--
-- Name: machine_status_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.machine_status_logs (
    id integer NOT NULL,
    machine_id character varying(50) NOT NULL,
    status integer NOT NULL,
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone,
    duration_sec integer,
    reason_id integer,
    notes text
);


ALTER TABLE public.machine_status_logs OWNER TO postgres;

--
-- Name: machine_status_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.machine_status_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.machine_status_logs_id_seq OWNER TO postgres;

--
-- Name: machine_status_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.machine_status_logs_id_seq OWNED BY public.machine_status_logs.id;


--
-- Name: machines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.machines (
    id integer NOT NULL,
    machine_code character varying(50) NOT NULL,
    machine_name character varying(255) NOT NULL,
    machine_type character varying(50),
    status character varying(20) DEFAULT 'idle'::character varying,
    cycle_time_sec real,
    material_dry_temp real,
    notes text
);


ALTER TABLE public.machines OWNER TO postgres;

--
-- Name: machines_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.machines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.machines_id_seq OWNER TO postgres;

--
-- Name: machines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.machines_id_seq OWNED BY public.machines.id;


--
-- Name: manufacturing_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.manufacturing_orders (
    id integer NOT NULL,
    mo_number character varying(50) NOT NULL,
    so_id integer,
    item_code character varying(50),
    quantity_to_produce integer,
    bom_id integer,
    due_date timestamp without time zone,
    status character varying(20) DEFAULT 'pending'::character varying,
    planned_start_time timestamp without time zone,
    planned_end_time timestamp without time zone,
    actual_start_time timestamp without time zone,
    actual_end_time timestamp without time zone,
    machine_id integer,
    adjustment_reason text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.manufacturing_orders OWNER TO postgres;

--
-- Name: manufacturing_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.manufacturing_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.manufacturing_orders_id_seq OWNER TO postgres;

--
-- Name: manufacturing_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.manufacturing_orders_id_seq OWNED BY public.manufacturing_orders.id;


--
-- Name: mold_parts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mold_parts (
    id integer NOT NULL,
    mold_id integer NOT NULL,
    part_number character varying(50) NOT NULL,
    part_name character varying(255) NOT NULL,
    quantity integer DEFAULT 1,
    material character varying(255),
    notes text
);


ALTER TABLE public.mold_parts OWNER TO postgres;

--
-- Name: mold_parts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mold_parts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.mold_parts_id_seq OWNER TO postgres;

--
-- Name: mold_parts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mold_parts_id_seq OWNED BY public.mold_parts.id;


--
-- Name: molds; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.molds (
    id integer NOT NULL,
    mold_code character varying(50) NOT NULL,
    mold_name character varying(255) NOT NULL,
    customer_id integer,
    received_date character varying(50),
    storage_location character varying(100),
    mold_type character varying(50),
    runner_system character varying(50),
    gate_type character varying(50),
    size_w real,
    size_l real,
    size_h real,
    weight real,
    cavity integer,
    part_weight_gram real,
    runner_weight_gram real,
    cycle_time_sec real,
    shot_counter integer DEFAULT 0,
    status character varying(20) DEFAULT 'active'::character varying,
    core_image_path text,
    cavity_image_path text,
    part_image_path text,
    notes text
);


ALTER TABLE public.molds OWNER TO postgres;

--
-- Name: molds_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.molds_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.molds_id_seq OWNER TO postgres;

--
-- Name: molds_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.molds_id_seq OWNED BY public.molds.id;


--
-- Name: pages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pages (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    url character varying(255) NOT NULL
);


ALTER TABLE public.pages OWNER TO postgres;

--
-- Name: pages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.pages_id_seq OWNER TO postgres;

--
-- Name: pages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pages_id_seq OWNED BY public.pages.id;


--
-- Name: production_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.production_records (
    id integer NOT NULL,
    mo_id integer NOT NULL,
    record_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    good_quantity integer DEFAULT 0,
    waste_quantity integer DEFAULT 0,
    operator_name character varying(100),
    note text
);


ALTER TABLE public.production_records OWNER TO postgres;

--
-- Name: production_records_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.production_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.production_records_id_seq OWNER TO postgres;

--
-- Name: production_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.production_records_id_seq OWNED BY public.production_records.id;


--
-- Name: role_pages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_pages (
    role_id integer NOT NULL,
    page_id integer NOT NULL
);


ALTER TABLE public.role_pages OWNER TO postgres;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(50) NOT NULL
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.roles_id_seq OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: sales_order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_order_items (
    id integer NOT NULL,
    so_id integer NOT NULL,
    item_code character varying(50),
    quantity integer,
    unit_price numeric(10,2),
    total_price numeric(10,2)
);


ALTER TABLE public.sales_order_items OWNER TO postgres;

--
-- Name: sales_order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sales_order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.sales_order_items_id_seq OWNER TO postgres;

--
-- Name: sales_order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sales_order_items_id_seq OWNED BY public.sales_order_items.id;


--
-- Name: sales_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_orders (
    id integer NOT NULL,
    so_number character varying(50) NOT NULL,
    customer_po_number character varying(50),
    customer_id integer,
    order_date timestamp without time zone,
    due_date timestamp without time zone,
    total_amount numeric(10,2),
    status character varying(20) DEFAULT 'draft'::character varying,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sales_orders OWNER TO postgres;

--
-- Name: sales_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sales_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.sales_orders_id_seq OWNER TO postgres;

--
-- Name: sales_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sales_orders_id_seq OWNED BY public.sales_orders.id;


--
-- Name: session; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.session OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    full_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    role character varying(50) NOT NULL,
    status character varying(50) DEFAULT 'active'::character varying
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: bom_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bom_items ALTER COLUMN id SET DEFAULT nextval('public.bom_items_id_seq'::regclass);


--
-- Name: boms id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.boms ALTER COLUMN id SET DEFAULT nextval('public.boms_id_seq'::regclass);


--
-- Name: defect_codes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.defect_codes ALTER COLUMN id SET DEFAULT nextval('public.defect_codes_id_seq'::regclass);


--
-- Name: downtime_reasons id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.downtime_reasons ALTER COLUMN id SET DEFAULT nextval('public.downtime_reasons_id_seq'::regclass);


--
-- Name: entities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entities ALTER COLUMN id SET DEFAULT nextval('public.entities_id_seq'::regclass);


--
-- Name: inventory_transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transactions ALTER COLUMN id SET DEFAULT nextval('public.inventory_transactions_id_seq'::regclass);


--
-- Name: items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.items ALTER COLUMN id SET DEFAULT nextval('public.items_id_seq'::regclass);


--
-- Name: machine_status_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.machine_status_logs ALTER COLUMN id SET DEFAULT nextval('public.machine_status_logs_id_seq'::regclass);


--
-- Name: machines id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.machines ALTER COLUMN id SET DEFAULT nextval('public.machines_id_seq'::regclass);


--
-- Name: manufacturing_orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manufacturing_orders ALTER COLUMN id SET DEFAULT nextval('public.manufacturing_orders_id_seq'::regclass);


--
-- Name: mold_parts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mold_parts ALTER COLUMN id SET DEFAULT nextval('public.mold_parts_id_seq'::regclass);


--
-- Name: molds id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.molds ALTER COLUMN id SET DEFAULT nextval('public.molds_id_seq'::regclass);


--
-- Name: pages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pages ALTER COLUMN id SET DEFAULT nextval('public.pages_id_seq'::regclass);


--
-- Name: production_records id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_records ALTER COLUMN id SET DEFAULT nextval('public.production_records_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: sales_order_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_order_items ALTER COLUMN id SET DEFAULT nextval('public.sales_order_items_id_seq'::regclass);


--
-- Name: sales_orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_orders ALTER COLUMN id SET DEFAULT nextval('public.sales_orders_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: bom_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bom_items (id, bom_id, material_code, material_name, mixing_ratio, unit) FROM stdin;
1	1	RM-0001	Plastic Material	100	%
\.


--
-- Data for Name: boms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.boms (id, product_part_number, product_name, mold_id, creation_date, version, is_active) FROM stdin;
1	FG-0001	Switch hub3	1	2025-12-08 10:19:17.295	1	1
\.


--
-- Data for Name: defect_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.defect_codes (id, code, description) FROM stdin;
\.


--
-- Data for Name: downtime_reasons; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.downtime_reasons (id, reason_code, description, category) FROM stdin;
\.


--
-- Data for Name: entities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.entities (id, name, tax_id, address, branch_code, branch_name, contact_person, email, phone, is_customer, is_vendor, entity_code) FROM stdin;
2	Beta Manufacturing Ltd	9876543210987	456 Industrial Estate, Rayong	00000	Main Factory	Jane Smith	purchasing@betamfg.com	038-222-2222	1	0	CUS-002
3	Global Steel Supply	1112223334445	789 Steel Road, Samut Prakan	00000	Warehouse	Mike Steel	sales@globalsteel.com	02-333-3333	0	1	VEN-001
4	Advanced Polymers Co	5556667778889	101 Plastic Way, Chonburi	00000	Sales Office	Sarah Polymer	info@advpolymers.com	038-444-4444	0	1	VEN-002
1	Alpha Corp Industries	1234567890123	123 Tech Park, Bangkok	00000	Headquarters	John Doen	contact@alphacorp.com	02-111-1111	1	0	CUS-001
5	advance engineer	0123456789102	aaaaaaaaaaaaaaaaaaaa	00	n/a	baba	ba@test	0885855695	1	1	CUS-0003
\.


--
-- Data for Name: entity_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.entity_roles (entity_id, role_name) FROM stdin;
\.


--
-- Data for Name: inventory_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_transactions (id, transaction_date, item_code, transaction_type, quantity_change, new_quantity, reference_type, reference_id, notes, created_by) FROM stdin;
1	2025-12-08 10:27:14.459894	RM-0001	adjustment	50	50	manual	\N	test	\N
2	2025-12-08 10:27:37.007843	FG-0001	adjustment	1000	1000	manual	\N	test	\N
\.


--
-- Data for Name: item_vendors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.item_vendors (item_id, vendor_id) FROM stdin;
\.


--
-- Data for Name: items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.items (id, item_code, item_name, item_type, uom, stock_quantity, status, cycle_time_sec, material_dry_temp, customer_id, model, material_name, grade, colour, part_weight_gram, image_path) FROM stdin;
2	RM-0001	Plastic Material	raw_material		50	active	\N	\N	3		ABS	GA800	Natural	\N	\N
1	FG-0001	Switch hub3	finished_good	\N	1000	active	\N	\N	5	\N	\N	\N	\N	\N	/uploads/items/item-1765187397308-134091126782251552.jpg
\.


--
-- Data for Name: machine_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.machine_data (machine_id, "timestamp", mold_count, machine_status, mold_temp_core, mold_temp_cavity, mo_number, cycle_time_sec, material_dry_temp, item_name) FROM stdin;
\.


--
-- Data for Name: machine_status_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.machine_status_logs (id, machine_id, status, start_time, end_time, duration_sec, reason_id, notes) FROM stdin;
\.


--
-- Data for Name: machines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.machines (id, machine_code, machine_name, machine_type, status, cycle_time_sec, material_dry_temp, notes) FROM stdin;
1	MC-001	Boler 120 ton	injection molding machine	idle	\N	\N	
\.


--
-- Data for Name: manufacturing_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.manufacturing_orders (id, mo_number, so_id, item_code, quantity_to_produce, bom_id, due_date, status, planned_start_time, planned_end_time, actual_start_time, actual_end_time, machine_id, adjustment_reason, created_at) FROM stdin;
1	MO-202512-0001	1	FG-0001	100	1	2025-12-08 00:00:00	pending	\N	\N	\N	\N	\N	\N	2025-12-08 10:44:31.469574
\.


--
-- Data for Name: mold_parts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mold_parts (id, mold_id, part_number, part_name, quantity, material, notes) FROM stdin;
1	1	epn5-100	ejector pin	15	skd61	
\.


--
-- Data for Name: molds; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.molds (id, mold_code, mold_name, customer_id, received_date, storage_location, mold_type, runner_system, gate_type, size_w, size_l, size_h, weight, cavity, part_weight_gram, runner_weight_gram, cycle_time_sec, shot_counter, status, core_image_path, cavity_image_path, part_image_path, notes) FROM stdin;
1	MOLD-0001	Hub3	5	2025-12-08	espa	2_plate	cool_runner	side gate	150	200	150	120	4	\N	\N	\N	500	\N	/uploads/molds/mold-1765188158374-134050523018669611.jpg	/uploads/molds/mold-1765188158396-134078136844550785.jpg	/uploads/molds/mold-1765188158415-134066076945910520.jpg	\N
\.


--
-- Data for Name: pages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pages (id, name, url) FROM stdin;
232	ใบสั่งผลิต (MO)	/manufacturing-orders.html
233	Production Schedule	/production-schedule.html
234	ระบบควบคุมคุณภาพ	/Quality Management System.html
235	รายการมาตรฐาน QC	/quality-standards-list.html
236	แดชบอร์ดคุณภาพ	/quality-dashboard.html
237	บันทึกผลตรวจสอบ	/quality-inspection.html
238	จัดการสต็อก	/inventory.html
11	จัดการข้อมูลสินค้า	/items.html
7	จัดการ BOM	/boms.html
2	จัดการประวัติแม่พิมพ์	/molds.html
242	จัดการเครื่องจักร	/machines.html
243	Projects	/projects.html
244	ใบสั่งซื้อ (PO)	/purchase-orders.html
245	ใบส่งของ (DO)	/delivery-orders.html
246	ใบแจ้งหนี้ (Invoice)	/invoices.html
247	ใบวางบิล	/billing-notes.html
248	ใบเสร็จรับเงิน	/receipts.html
15	จัดการลูกค้า	/customers.html
16	จัดการผู้ขาย	/vendors.html
17	จัดการผู้ใช้	/users.html
252	จัดการ Roles	/manage_roles.html
20	จัดการสิทธิ์	/manage_permissions.html
3	สร้างแม่พิมพ์ใหม่	/create-mold.html
4	แก้ไขข้อมูลแม่พิมพ์	/edit-mold.html
1	Dashboard	/dashboard.html
222	ภาพรวมโรงงาน	/overview-dashboard.html
223	การผลิต (Real-time)	/production-dashboard.html
224	การขายและการตลาด	/sales-dashboard.html
5	รายละเอียดแม่พิมพ์	/mold-details.html
6	จัดการ Part List	/manage-parts.html
8	สร้าง BOM ใหม่	/create-bom.html
9	แก้ไข BOM	/edit-bom.html
10	รายละเอียด BOM	/bom-details.html
12	สร้างสินค้าใหม่	/create-item.html
13	แก้ไขข้อมูลสินค้า	/edit-item.html
14	รายละเอียดสินค้า	/item-details.html
18	เพิ่มผู้ใช้	/add-user.html
225	คลังสินค้า	/inventory-dashboard.html
226	Workflow การขาย	/workflow-dashboard.html
227	OEE Dashboard	/oee_dashboard.html
228	Downtime Log	/downtime-log.html
229	วิเคราะห์ใบสั่งผลิต	/mo_dashboard.html
230	Operator Interface	/operator.html
19	แก้ไขผู้ใช้	/edit-user.html
231	ใบสั่งขาย (SO)	/sales-orders.html
\.


--
-- Data for Name: production_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.production_records (id, mo_id, record_date, good_quantity, waste_quantity, operator_name, note) FROM stdin;
\.


--
-- Data for Name: role_pages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.role_pages (role_id, page_id) FROM stdin;
1	1
2	1
3	1
1	228
3	228
1	227
3	227
1	230
3	230
1	233
3	233
1	243
1	226
1	224
1	223
1	9
2	9
1	4
1	13
1	19
1	225
1	7
1	6
1	252
1	11
1	242
1	2
1	16
1	17
1	15
1	238
1	20
1	236
1	237
1	246
1	247
1	245
1	231
1	244
1	232
1	248
1	18
1	222
1	234
1	235
1	10
1	5
1	14
1	229
1	8
1	3
3	3
1	12
3	12
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, name) FROM stdin;
1	admin
2	qc
3	user
58	mold
\.


--
-- Data for Name: sales_order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sales_order_items (id, so_id, item_code, quantity, unit_price, total_price) FROM stdin;
3	1	FG-0001	100	51.00	5100.00
\.


--
-- Data for Name: sales_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sales_orders (id, so_number, customer_po_number, customer_id, order_date, due_date, total_amount, status, created_by, created_at) FROM stdin;
1	SO-202512-0001	tpo	5	2025-12-08 00:00:00	2025-12-08 00:00:00	5100.00	in_production	1	2025-12-08 10:38:22.159849
\.


--
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.session (sid, sess, expire) FROM stdin;
1dzEWkcbekYBDv6pUix0MVOp3Bhu5DYD	{"cookie":{"originalMaxAge":604800000,"expires":"2025-12-15T10:55:43.461Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"userId":1,"role":"admin","name":"admin dd"}	2025-12-15 10:55:54
NaWtF9ealpssD17J29uD_PFfNpdrV4RO	{"cookie":{"originalMaxAge":604800000,"expires":"2025-12-15T06:50:26.320Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"userId":1,"role":"admin","name":"Administrator"}	2025-12-15 06:50:27
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, full_name, email, password, role, status) FROM stdin;
1	admin dd	admin@local	$2b$10$DPw.i9fWjqEvteh4kgzpRehvTWk2/vKvDzCu1Bf6XfNr9Xq3gI0pK	admin	active
2	manee 	manee@gmail.com	$2b$10$WPpWE/arQAS2zhRTr.V26eYFHgOU3Mr5aEszot.gJsgo2XgEBiZRu	user	active
\.


--
-- Name: bom_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bom_items_id_seq', 1, true);


--
-- Name: boms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.boms_id_seq', 1, true);


--
-- Name: defect_codes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.defect_codes_id_seq', 1, false);


--
-- Name: downtime_reasons_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.downtime_reasons_id_seq', 1, false);


--
-- Name: entities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.entities_id_seq', 5, true);


--
-- Name: inventory_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inventory_transactions_id_seq', 2, true);


--
-- Name: items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.items_id_seq', 2, true);


--
-- Name: machine_status_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.machine_status_logs_id_seq', 1, false);


--
-- Name: machines_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.machines_id_seq', 1, true);


--
-- Name: manufacturing_orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.manufacturing_orders_id_seq', 1, true);


--
-- Name: mold_parts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.mold_parts_id_seq', 1, true);


--
-- Name: molds_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.molds_id_seq', 1, true);


--
-- Name: pages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pages_id_seq', 1705, true);


--
-- Name: production_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.production_records_id_seq', 1, false);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 145, true);


--
-- Name: sales_order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sales_order_items_id_seq', 3, true);


--
-- Name: sales_orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sales_orders_id_seq', 1, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 2, true);


--
-- Name: bom_items bom_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bom_items
    ADD CONSTRAINT bom_items_pkey PRIMARY KEY (id);


--
-- Name: boms boms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.boms
    ADD CONSTRAINT boms_pkey PRIMARY KEY (id);


--
-- Name: defect_codes defect_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.defect_codes
    ADD CONSTRAINT defect_codes_code_key UNIQUE (code);


--
-- Name: defect_codes defect_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.defect_codes
    ADD CONSTRAINT defect_codes_pkey PRIMARY KEY (id);


--
-- Name: downtime_reasons downtime_reasons_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.downtime_reasons
    ADD CONSTRAINT downtime_reasons_pkey PRIMARY KEY (id);


--
-- Name: downtime_reasons downtime_reasons_reason_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.downtime_reasons
    ADD CONSTRAINT downtime_reasons_reason_code_key UNIQUE (reason_code);


--
-- Name: entities entities_entity_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entities
    ADD CONSTRAINT entities_entity_code_key UNIQUE (entity_code);


--
-- Name: entities entities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entities
    ADD CONSTRAINT entities_pkey PRIMARY KEY (id);


--
-- Name: entity_roles entity_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_roles
    ADD CONSTRAINT entity_roles_pkey PRIMARY KEY (entity_id, role_name);


--
-- Name: inventory_transactions inventory_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_pkey PRIMARY KEY (id);


--
-- Name: item_vendors item_vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item_vendors
    ADD CONSTRAINT item_vendors_pkey PRIMARY KEY (item_id, vendor_id);


--
-- Name: items items_item_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_item_code_key UNIQUE (item_code);


--
-- Name: items items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_pkey PRIMARY KEY (id);


--
-- Name: machine_data machine_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.machine_data
    ADD CONSTRAINT machine_data_pkey PRIMARY KEY (machine_id);


--
-- Name: machine_status_logs machine_status_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.machine_status_logs
    ADD CONSTRAINT machine_status_logs_pkey PRIMARY KEY (id);


--
-- Name: machines machines_machine_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.machines
    ADD CONSTRAINT machines_machine_code_key UNIQUE (machine_code);


--
-- Name: machines machines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.machines
    ADD CONSTRAINT machines_pkey PRIMARY KEY (id);


--
-- Name: manufacturing_orders manufacturing_orders_mo_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manufacturing_orders
    ADD CONSTRAINT manufacturing_orders_mo_number_key UNIQUE (mo_number);


--
-- Name: manufacturing_orders manufacturing_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manufacturing_orders
    ADD CONSTRAINT manufacturing_orders_pkey PRIMARY KEY (id);


--
-- Name: mold_parts mold_parts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mold_parts
    ADD CONSTRAINT mold_parts_pkey PRIMARY KEY (id);


--
-- Name: molds molds_mold_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.molds
    ADD CONSTRAINT molds_mold_code_key UNIQUE (mold_code);


--
-- Name: molds molds_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.molds
    ADD CONSTRAINT molds_pkey PRIMARY KEY (id);


--
-- Name: pages pages_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_name_key UNIQUE (name);


--
-- Name: pages pages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_pkey PRIMARY KEY (id);


--
-- Name: pages pages_url_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_url_key UNIQUE (url);


--
-- Name: production_records production_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_records
    ADD CONSTRAINT production_records_pkey PRIMARY KEY (id);


--
-- Name: role_pages role_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_pages
    ADD CONSTRAINT role_pages_pkey PRIMARY KEY (role_id, page_id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: sales_order_items sales_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_order_items
    ADD CONSTRAINT sales_order_items_pkey PRIMARY KEY (id);


--
-- Name: sales_orders sales_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_pkey PRIMARY KEY (id);


--
-- Name: sales_orders sales_orders_so_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_so_number_key UNIQUE (so_number);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_session_expire" ON public.session USING btree (expire);


--
-- Name: idx_status_logs_machine_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_status_logs_machine_time ON public.machine_status_logs USING btree (machine_id, start_time);


--
-- Name: bom_items bom_items_bom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bom_items
    ADD CONSTRAINT bom_items_bom_id_fkey FOREIGN KEY (bom_id) REFERENCES public.boms(id) ON DELETE CASCADE;


--
-- Name: boms boms_mold_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.boms
    ADD CONSTRAINT boms_mold_id_fkey FOREIGN KEY (mold_id) REFERENCES public.molds(id);


--
-- Name: entity_roles entity_roles_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_roles
    ADD CONSTRAINT entity_roles_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id) ON DELETE CASCADE;


--
-- Name: machine_status_logs machine_status_logs_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.machine_status_logs
    ADD CONSTRAINT machine_status_logs_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(machine_code);


--
-- Name: machine_status_logs machine_status_logs_reason_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.machine_status_logs
    ADD CONSTRAINT machine_status_logs_reason_id_fkey FOREIGN KEY (reason_id) REFERENCES public.downtime_reasons(id);


--
-- Name: manufacturing_orders manufacturing_orders_bom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manufacturing_orders
    ADD CONSTRAINT manufacturing_orders_bom_id_fkey FOREIGN KEY (bom_id) REFERENCES public.boms(id);


--
-- Name: manufacturing_orders manufacturing_orders_so_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manufacturing_orders
    ADD CONSTRAINT manufacturing_orders_so_id_fkey FOREIGN KEY (so_id) REFERENCES public.sales_orders(id);


--
-- Name: mold_parts mold_parts_mold_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mold_parts
    ADD CONSTRAINT mold_parts_mold_id_fkey FOREIGN KEY (mold_id) REFERENCES public.molds(id) ON DELETE CASCADE;


--
-- Name: molds molds_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.molds
    ADD CONSTRAINT molds_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.entities(id);


--
-- Name: production_records production_records_mo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_records
    ADD CONSTRAINT production_records_mo_id_fkey FOREIGN KEY (mo_id) REFERENCES public.manufacturing_orders(id) ON DELETE CASCADE;


--
-- Name: role_pages role_pages_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_pages
    ADD CONSTRAINT role_pages_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.pages(id);


--
-- Name: role_pages role_pages_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_pages
    ADD CONSTRAINT role_pages_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: sales_order_items sales_order_items_so_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_order_items
    ADD CONSTRAINT sales_order_items_so_id_fkey FOREIGN KEY (so_id) REFERENCES public.sales_orders(id) ON DELETE CASCADE;


--
-- Name: sales_orders sales_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: sales_orders sales_orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.entities(id);


--
-- PostgreSQL database dump complete
--

\unrestrict wztF5XAItHjEfbXIXfzcjHy1f5cH6yAg25II5Hswbu0VLmK0azMjlobQVrfLp5N

