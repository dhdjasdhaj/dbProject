-- Read-only schema reference. No business rows exported.
--
-- PostgreSQL database dump
--


-- Dumped from database version 16.15 (Debian 16.15-1.pgdg12+2)
-- Dumped by pg_dump version 16.15 (Debian 16.15-1.pgdg12+2)

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
-- Name: hstore; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS hstore WITH SCHEMA public;


--
-- Name: EXTENSION hstore; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION hstore IS 'data type for storing sets of (key, value) pairs';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: community_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_comments (
    id bigint NOT NULL,
    post_id bigint NOT NULL,
    author_id bigint NOT NULL,
    content character varying(2000) NOT NULL,
    rating integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_example boolean DEFAULT false NOT NULL,
    CONSTRAINT community_comments_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: community_comments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.community_comments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: community_comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.community_comments_id_seq OWNED BY public.community_comments.id;


--
-- Name: community_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_posts (
    id bigint NOT NULL,
    author_id bigint NOT NULL,
    channel character varying(24) NOT NULL,
    title character varying(120) NOT NULL,
    content text NOT NULL,
    status character varying(16) NOT NULL,
    pinned boolean DEFAULT false NOT NULL,
    file_key character varying(200),
    file_name character varying(180),
    file_size bigint,
    downloads bigint DEFAULT 0 NOT NULL,
    moderation_note character varying(500) DEFAULT ''::character varying NOT NULL,
    moderator_id bigint,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    topic character varying(28) DEFAULT '面试复盘'::character varying NOT NULL,
    cover_image character varying(240),
    source_title character varying(160),
    source_url character varying(500),
    seed_key character varying(80),
    is_example boolean DEFAULT false NOT NULL
);


--
-- Name: community_posts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.community_posts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: community_posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.community_posts_id_seq OWNED BY public.community_posts.id;


--
-- Name: community_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_reports (
    id bigint NOT NULL,
    post_id bigint NOT NULL,
    author_id bigint NOT NULL,
    reason character varying(500) NOT NULL,
    resolved boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: community_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.community_reports_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: community_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.community_reports_id_seq OWNED BY public.community_reports.id;


--
-- Name: community_seed_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_seed_versions (
    version character varying(80) NOT NULL,
    applied_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: interview_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interview_answers (
    id bigint NOT NULL,
    answered_at timestamp(6) without time zone NOT NULL,
    category character varying(255),
    feedback text,
    key_points_json text,
    question text,
    question_index integer,
    reference_answer text,
    score integer,
    user_answer text,
    session_id bigint NOT NULL
);


--
-- Name: interview_answers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.interview_answers ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.interview_answers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: interview_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interview_sessions (
    id bigint NOT NULL,
    audio_enabled boolean,
    complete_video_duration_seconds integer,
    complete_video_file_key character varying(500),
    complete_video_file_size bigint,
    complete_video_file_url character varying(1000),
    completed_at timestamp(6) without time zone,
    conversation_log_json text,
    created_at timestamp(6) without time zone NOT NULL,
    current_question_index integer,
    evaluate_error character varying(500),
    evaluate_status character varying(20),
    improvements_json text,
    max_follow_ups integer,
    mode character varying(20),
    overall_feedback text,
    overall_score integer,
    questions_json text,
    reference_answers_json text,
    session_id character varying(36) NOT NULL,
    status character varying(20),
    strengths_json text,
    total_questions integer,
    video_analysis_json text,
    video_enabled boolean,
    resume_id bigint NOT NULL,
    CONSTRAINT interview_sessions_evaluate_status_check CHECK (((evaluate_status)::text = ANY ((ARRAY['PENDING'::character varying, 'PROCESSING'::character varying, 'COMPLETED'::character varying, 'FAILED'::character varying])::text[]))),
    CONSTRAINT interview_sessions_status_check CHECK (((status)::text = ANY ((ARRAY['CREATED'::character varying, 'IN_PROGRESS'::character varying, 'COMPLETED'::character varying, 'EVALUATED'::character varying])::text[])))
);


--
-- Name: interview_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.interview_sessions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.interview_sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: knowledge_bases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knowledge_bases (
    id bigint NOT NULL,
    access_count integer,
    category character varying(100),
    chunk_count integer,
    content_type character varying(255),
    file_hash character varying(64) NOT NULL,
    file_size bigint,
    last_accessed_at timestamp(6) without time zone,
    name character varying(255) NOT NULL,
    original_filename character varying(255) NOT NULL,
    owner_user_id bigint,
    question_count integer,
    storage_key character varying(500),
    storage_url character varying(1000),
    uploaded_at timestamp(6) without time zone NOT NULL,
    vector_error character varying(500),
    vector_status character varying(20),
    CONSTRAINT knowledge_bases_vector_status_check CHECK (((vector_status)::text = ANY ((ARRAY['PENDING'::character varying, 'PROCESSING'::character varying, 'COMPLETED'::character varying, 'FAILED'::character varying])::text[])))
);


--
-- Name: knowledge_bases_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.knowledge_bases ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.knowledge_bases_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: rag_chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rag_chat_messages (
    id bigint NOT NULL,
    completed boolean,
    content text NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    message_order integer NOT NULL,
    type character varying(20) NOT NULL,
    updated_at timestamp(6) without time zone,
    session_id bigint NOT NULL,
    CONSTRAINT rag_chat_messages_type_check CHECK (((type)::text = ANY ((ARRAY['USER'::character varying, 'ASSISTANT'::character varying])::text[])))
);


--
-- Name: rag_chat_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.rag_chat_messages ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.rag_chat_messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: rag_chat_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rag_chat_sessions (
    id bigint NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    is_pinned boolean DEFAULT false,
    message_count integer,
    owner_user_id bigint,
    status character varying(20),
    title character varying(255) NOT NULL,
    updated_at timestamp(6) without time zone,
    CONSTRAINT rag_chat_sessions_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'ARCHIVED'::character varying])::text[])))
);


--
-- Name: rag_chat_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.rag_chat_sessions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.rag_chat_sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: rag_session_knowledge_bases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rag_session_knowledge_bases (
    session_id bigint NOT NULL,
    knowledge_base_id bigint NOT NULL
);


--
-- Name: resume_analyses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resume_analyses (
    id bigint NOT NULL,
    analyzed_at timestamp(6) without time zone NOT NULL,
    content_score integer,
    expression_score integer,
    overall_score integer,
    project_score integer,
    skill_match_score integer,
    strengths_json text,
    structure_score integer,
    suggestions_json text,
    summary text,
    resume_id bigint NOT NULL
);


--
-- Name: resume_analyses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.resume_analyses ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.resume_analyses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: resume_template; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resume_template (
    id bigint NOT NULL,
    category_slug character varying(64),
    cover_url character varying(512),
    created_at timestamp(6) without time zone,
    detail_url character varying(512),
    local_image_path character varying(255),
    source_id bigint NOT NULL,
    style_tags text,
    title character varying(255) NOT NULL,
    updated_at timestamp(6) without time zone,
    usage_count integer,
    word_download_url character varying(512),
    word_local_path character varying(255)
);


--
-- Name: resume_template_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.resume_template ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.resume_template_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: resumes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resumes (
    id bigint NOT NULL,
    access_count integer,
    analyze_error character varying(500),
    analyze_status character varying(20),
    content_type character varying(255),
    file_hash character varying(64) NOT NULL,
    file_size bigint,
    last_accessed_at timestamp(6) without time zone,
    original_filename character varying(255) NOT NULL,
    owner_user_id bigint,
    resume_text text,
    storage_key character varying(500),
    storage_url character varying(1000),
    uploaded_at timestamp(6) without time zone NOT NULL,
    CONSTRAINT resumes_analyze_status_check CHECK (((analyze_status)::text = ANY ((ARRAY['PENDING'::character varying, 'PROCESSING'::character varying, 'COMPLETED'::character varying, 'FAILED'::character varying])::text[])))
);


--
-- Name: resumes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.resumes ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.resumes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    password_hash character varying(120) NOT NULL,
    username character varying(64) NOT NULL,
    role character varying(16) DEFAULT 'USER'::character varying NOT NULL
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.users ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: vector_store; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vector_store (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    content text,
    metadata json,
    embedding public.vector(1024)
);


--
-- Name: community_comments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_comments ALTER COLUMN id SET DEFAULT nextval('public.community_comments_id_seq'::regclass);


--
-- Name: community_posts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_posts ALTER COLUMN id SET DEFAULT nextval('public.community_posts_id_seq'::regclass);


--
-- Name: community_reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_reports ALTER COLUMN id SET DEFAULT nextval('public.community_reports_id_seq'::regclass);


--
-- Name: community_comments community_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_comments
    ADD CONSTRAINT community_comments_pkey PRIMARY KEY (id);


--
-- Name: community_posts community_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_posts
    ADD CONSTRAINT community_posts_pkey PRIMARY KEY (id);


--
-- Name: community_reports community_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_reports
    ADD CONSTRAINT community_reports_pkey PRIMARY KEY (id);


--
-- Name: community_reports community_reports_post_id_author_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_reports
    ADD CONSTRAINT community_reports_post_id_author_id_key UNIQUE (post_id, author_id);


--
-- Name: community_seed_versions community_seed_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_seed_versions
    ADD CONSTRAINT community_seed_versions_pkey PRIMARY KEY (version);


--
-- Name: interview_answers interview_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_answers
    ADD CONSTRAINT interview_answers_pkey PRIMARY KEY (id);


--
-- Name: interview_sessions interview_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_sessions
    ADD CONSTRAINT interview_sessions_pkey PRIMARY KEY (id);


--
-- Name: knowledge_bases knowledge_bases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_bases
    ADD CONSTRAINT knowledge_bases_pkey PRIMARY KEY (id);


--
-- Name: rag_chat_messages rag_chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rag_chat_messages
    ADD CONSTRAINT rag_chat_messages_pkey PRIMARY KEY (id);


--
-- Name: rag_chat_sessions rag_chat_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rag_chat_sessions
    ADD CONSTRAINT rag_chat_sessions_pkey PRIMARY KEY (id);


--
-- Name: rag_session_knowledge_bases rag_session_knowledge_bases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rag_session_knowledge_bases
    ADD CONSTRAINT rag_session_knowledge_bases_pkey PRIMARY KEY (session_id, knowledge_base_id);


--
-- Name: resume_analyses resume_analyses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resume_analyses
    ADD CONSTRAINT resume_analyses_pkey PRIMARY KEY (id);


--
-- Name: resume_template resume_template_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resume_template
    ADD CONSTRAINT resume_template_pkey PRIMARY KEY (id);


--
-- Name: resumes resumes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resumes
    ADD CONSTRAINT resumes_pkey PRIMARY KEY (id);


--
-- Name: interview_sessions uk42bhenf7mu90ochoc1efpg3xa; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_sessions
    ADD CONSTRAINT uk42bhenf7mu90ochoc1efpg3xa UNIQUE (session_id);


--
-- Name: interview_answers uk_interview_answer_session_question; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_answers
    ADD CONSTRAINT uk_interview_answer_session_question UNIQUE (session_id, question_index);


--
-- Name: knowledge_bases uk_kb_owner_filehash; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_bases
    ADD CONSTRAINT uk_kb_owner_filehash UNIQUE (owner_user_id, file_hash);


--
-- Name: resumes uk_resume_owner_filehash; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resumes
    ADD CONSTRAINT uk_resume_owner_filehash UNIQUE (owner_user_id, file_hash);


--
-- Name: resume_template uk_resume_template_source; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resume_template
    ADD CONSTRAINT uk_resume_template_source UNIQUE (source_id);


--
-- Name: users ukr43af9ap4edm43mmtq01oddj6; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT ukr43af9ap4edm43mmtq01oddj6 UNIQUE (username);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vector_store vector_store_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vector_store
    ADD CONSTRAINT vector_store_pkey PRIMARY KEY (id);


--
-- Name: community_comment_post; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX community_comment_post ON public.community_comments USING btree (post_id);


--
-- Name: community_feed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX community_feed ON public.community_posts USING btree (status, channel, created_at DESC);


--
-- Name: community_one_rating; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX community_one_rating ON public.community_comments USING btree (post_id, author_id) WHERE (rating IS NOT NULL);


--
-- Name: community_seed_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX community_seed_key ON public.community_posts USING btree (seed_key);


--
-- Name: idx_interview_answer_session_question; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interview_answer_session_question ON public.interview_answers USING btree (session_id, question_index);


--
-- Name: idx_interview_session_resume_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interview_session_resume_created ON public.interview_sessions USING btree (resume_id, created_at);


--
-- Name: idx_interview_session_resume_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interview_session_resume_status_created ON public.interview_sessions USING btree (resume_id, status, created_at);


--
-- Name: idx_kb_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_category ON public.knowledge_bases USING btree (category);


--
-- Name: idx_rag_message_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rag_message_order ON public.rag_chat_messages USING btree (session_id, message_order);


--
-- Name: idx_rag_message_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rag_message_session ON public.rag_chat_messages USING btree (session_id);


--
-- Name: idx_rag_session_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rag_session_updated ON public.rag_chat_sessions USING btree (updated_at);


--
-- Name: spring_ai_vector_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX spring_ai_vector_index ON public.vector_store USING hnsw (embedding public.vector_cosine_ops);


--
-- Name: community_comments community_comments_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_comments
    ADD CONSTRAINT community_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: community_comments community_comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_comments
    ADD CONSTRAINT community_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.community_posts(id);


--
-- Name: community_posts community_posts_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_posts
    ADD CONSTRAINT community_posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: community_posts community_posts_moderator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_posts
    ADD CONSTRAINT community_posts_moderator_id_fkey FOREIGN KEY (moderator_id) REFERENCES public.users(id);


--
-- Name: community_reports community_reports_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_reports
    ADD CONSTRAINT community_reports_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: community_reports community_reports_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_reports
    ADD CONSTRAINT community_reports_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.community_posts(id);


--
-- Name: rag_chat_messages fkfohypaygc0qfqo62vyaxlbntn; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rag_chat_messages
    ADD CONSTRAINT fkfohypaygc0qfqo62vyaxlbntn FOREIGN KEY (session_id) REFERENCES public.rag_chat_sessions(id);


--
-- Name: interview_sessions fkhresfe6p1s53klvmqhxxissa2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_sessions
    ADD CONSTRAINT fkhresfe6p1s53klvmqhxxissa2 FOREIGN KEY (resume_id) REFERENCES public.resumes(id);


--
-- Name: interview_answers fkjeqvvamvdarrcbswn6kkiuym9; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_answers
    ADD CONSTRAINT fkjeqvvamvdarrcbswn6kkiuym9 FOREIGN KEY (session_id) REFERENCES public.interview_sessions(id);


--
-- Name: rag_session_knowledge_bases fkjsfwqyt1ntgr0fcvjieq8c0nb; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rag_session_knowledge_bases
    ADD CONSTRAINT fkjsfwqyt1ntgr0fcvjieq8c0nb FOREIGN KEY (knowledge_base_id) REFERENCES public.knowledge_bases(id);


--
-- Name: rag_session_knowledge_bases fkqfob368wcvb82elsjkx2troqu; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rag_session_knowledge_bases
    ADD CONSTRAINT fkqfob368wcvb82elsjkx2troqu FOREIGN KEY (session_id) REFERENCES public.rag_chat_sessions(id);


--
-- Name: resume_analyses fkrp4f11h23bp0j118yan185lr5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resume_analyses
    ADD CONSTRAINT fkrp4f11h23bp0j118yan185lr5 FOREIGN KEY (resume_id) REFERENCES public.resumes(id);


--
-- PostgreSQL database dump complete
--


