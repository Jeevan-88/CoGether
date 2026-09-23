-- Migration 011: CoStudy World 2D Learning City & Gamified CSE Curriculum

-- 1. Districts Registry (15 Knowledge Districts)
CREATE TABLE IF NOT EXISTS costudy.districts (
  id VARCHAR(50) PRIMARY KEY,
  slug VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  theme_color VARCHAR(30) NOT NULL, -- Hex / CSS color
  accent_color VARCHAR(30) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  icon VARCHAR(50) NOT NULL,
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Knowledge Buildings
CREATE TABLE IF NOT EXISTS costudy.buildings (
  id VARCHAR(80) PRIMARY KEY,
  district_id VARCHAR(50) NOT NULL REFERENCES costudy.districts(id),
  slug VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  category VARCHAR(80) NOT NULL,
  prerequisite_building_ids TEXT[] DEFAULT '{}',
  total_nodes INTEGER NOT NULL DEFAULT 6,
  icon VARCHAR(50) NOT NULL,
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE', -- AVAILABLE, LOCKED, COMING_SOON
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Universal Subjects
CREATE TABLE IF NOT EXISTS costudy.subjects (
  id VARCHAR(80) PRIMARY KEY,
  building_id VARCHAR(80) REFERENCES costudy.buildings(id),
  slug VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  syllabus_code VARCHAR(50),
  icon VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. University Curriculum Mappings (Universal Subject -> B.Tech CSE Semesters 1-8)
CREATE TABLE IF NOT EXISTS costudy.curriculum_mappings (
  id VARCHAR(100) PRIMARY KEY,
  university_name VARCHAR(120) NOT NULL DEFAULT 'Universal Academic Standard',
  degree VARCHAR(80) NOT NULL DEFAULT 'B.Tech CSE',
  year_number INTEGER NOT NULL, -- 1 to 4
  semester_number INTEGER NOT NULL, -- 1 to 8
  subject_id VARCHAR(80) NOT NULL REFERENCES costudy.subjects(id),
  subject_title VARCHAR(120) NOT NULL,
  is_core BOOLEAN NOT NULL DEFAULT TRUE,
  credits INTEGER NOT NULL DEFAULT 4,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Learning Nodes (Locations on Building Campus Pathway)
CREATE TABLE IF NOT EXISTS costudy.learning_nodes (
  id VARCHAR(100) PRIMARY KEY,
  subject_id VARCHAR(80) NOT NULL REFERENCES costudy.subjects(id),
  node_order INTEGER NOT NULL,
  slug VARCHAR(80) NOT NULL,
  title VARCHAR(140) NOT NULL,
  location_type VARCHAR(60) NOT NULL, -- RECEPTION, WORKSHOP, LAB, STUDIO, ARENA, TOWER
  description TEXT,
  estimated_minutes INTEGER NOT NULL DEFAULT 20,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Interactive Lessons
CREATE TABLE IF NOT EXISTS costudy.lessons (
  id VARCHAR(100) PRIMARY KEY,
  node_id VARCHAR(100) NOT NULL REFERENCES costudy.learning_nodes(id),
  title VARCHAR(160) NOT NULL,
  summary TEXT,
  content_markdown TEXT NOT NULL,
  key_takeaways TEXT[] DEFAULT '{}',
  sandbox_starter_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Real-World Coding Problems (3-4 Problems per Lesson)
CREATE TABLE IF NOT EXISTS costudy.problems (
  id VARCHAR(100) PRIMARY KEY,
  lesson_id VARCHAR(100) NOT NULL REFERENCES costudy.lessons(id),
  problem_order INTEGER NOT NULL,
  title VARCHAR(160) NOT NULL,
  difficulty VARCHAR(30) NOT NULL DEFAULT 'MEDIUM', -- BASIC, APPLICATION, REAL_WORLD, HARD
  description TEXT NOT NULL,
  starter_code TEXT NOT NULL,
  test_cases_json JSONB NOT NULL DEFAULT '[]',
  solution_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Themed Real-World Quests
CREATE TABLE IF NOT EXISTS costudy.quests (
  id VARCHAR(100) PRIMARY KEY,
  subject_id VARCHAR(80) NOT NULL REFERENCES costudy.subjects(id),
  title VARCHAR(160) NOT NULL,
  theme_name VARCHAR(120) NOT NULL,
  brief TEXT NOT NULL,
  objective TEXT NOT NULL,
  reward_xp INTEGER NOT NULL DEFAULT 250,
  badge_title VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. User Progress Tracking
CREATE TABLE IF NOT EXISTS costudy.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(100) NOT NULL,
  node_id VARCHAR(100) NOT NULL REFERENCES costudy.learning_nodes(id),
  status VARCHAR(30) NOT NULL DEFAULT 'IN_PROGRESS', -- NOT_STARTED, IN_PROGRESS, COMPLETED, MASTERED
  score INTEGER NOT NULL DEFAULT 0,
  mastery_pct INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, node_id)
);

-- 10. User Problem Submissions
CREATE TABLE IF NOT EXISTS costudy.user_problem_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(100) NOT NULL,
  problem_id VARCHAR(100) NOT NULL REFERENCES costudy.problems(id),
  code_submitted TEXT NOT NULL,
  passed BOOLEAN NOT NULL DEFAULT FALSE,
  test_results_json JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. AI Interview Results
CREATE TABLE IF NOT EXISTS costudy.user_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(100) NOT NULL,
  subject_id VARCHAR(80) NOT NULL REFERENCES costudy.subjects(id),
  lesson_id VARCHAR(100) NOT NULL REFERENCES costudy.lessons(id),
  questions_json JSONB NOT NULL,
  answers_json JSONB NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  mastery_verdict VARCHAR(50) NOT NULL DEFAULT 'PASSED',
  feedback TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. User Unlocks & Physical Landmarks
CREATE TABLE IF NOT EXISTS costudy.user_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(100) NOT NULL,
  unlock_type VARCHAR(40) NOT NULL, -- DISTRICT, BUILDING, NODE, ROAD, LANDMARK, BADGE
  entity_id VARCHAR(100) NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, unlock_type, entity_id)
);

-- ── SEED DATA ───────────────────────────────────────────────────────────────

-- 15 Districts
INSERT INTO costudy.districts (id, slug, name, theme_color, accent_color, description, order_index, icon, position_x, position_y) VALUES
('dist_foundation', 'foundation', 'Foundation District', '#FFE082', '#0B0B0B', 'Mathematics, Physics, Discrete Math & Engineering Logic.', 1, 'Binary', 120, 100),
('dist_programming', 'programming', 'Programming District', '#80D8FF', '#0B0B0B', 'C, C++, Java, Python, Go, Rust, Data Structures & Algorithms.', 2, 'Code2', 360, 100),
('dist_web', 'web', 'Web District', '#CCFF00', '#0B0B0B', 'HTML, CSS, JavaScript, TypeScript, React, Node.js & Web Security.', 3, 'Globe', 600, 100),
('dist_cs', 'computer-science', 'Computer Science District', '#B388FF', '#0B0B0B', 'Theory of Computation, Compiler Design, Architecture & OS.', 4, 'Cpu', 840, 100),
('dist_db', 'database', 'Database District', '#FF80AB', '#0B0B0B', 'SQL, DBMS, PostgreSQL, MySQL, Redis, NoSQL & Schema Architecture.', 5, 'Database', 120, 320),
('dist_net', 'network', 'Network District', '#A7FFEB', '#0B0B0B', 'Computer Networks, Protocols, Routing, Sockets & Transmission.', 6, 'Radio', 360, 320),
('dist_systems', 'systems', 'Systems District', '#FFD180', '#0B0B0B', 'Linux Kernel, Distributed Systems, Concurrency & Low-Level Code.', 7, 'Terminal', 600, 320),
('dist_se', 'software-engineering', 'Software Engineering District', '#EA80FC', '#0B0B0B', 'Design Patterns, System Design, Testing, QA & Microservices.', 8, 'Layers', 840, 320),
('dist_data', 'data', 'Data District', '#84FFFF', '#0B0B0B', 'Data Analysis, Engineering, Pandas, Big Data & Apache Spark.', 9, 'BarChart2', 120, 540),
('dist_ai', 'ai', 'AI District', '#FF3366', '#0B0B0B', 'Math for AI, Statistics, ML, Deep Learning, NLP, LLMs & Agents.', 10, 'Sparkles', 360, 540),
('dist_cloud', 'cloud', 'Cloud District', '#B9F6CA', '#0B0B0B', 'AWS, Azure, GCP, Docker, Kubernetes, Terraform & Observability.', 11, 'Cloud', 600, 540),
('dist_devops', 'devops', 'DevOps District', '#FF9E80', '#0B0B0B', 'Linux Admin, Infrastructure as Code, CI/CD, GitOps & SRE.', 12, 'GitBranch', 840, 540),
('dist_security', 'cybersecurity', 'Cybersecurity District', '#FF5252', '#0B0B0B', 'Network Security, SOC Incident Response, Pentesting & Cryptography.', 13, 'ShieldCheck', 240, 760),
('dist_ece', 'electronics', 'Electronics / ECE District', '#FFFF8D', '#0B0B0B', 'Digital Logic, Microprocessors, Embedded Systems & IoT.', 14, 'Zap', 480, 760),
('dist_career', 'career', 'Career District', '#69F0AE', '#0B0B0B', 'Frontend, Backend, Full Stack, DevOps, AI & Security Portfolios.', 15, 'Briefcase', 720, 760)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, theme_color = EXCLUDED.theme_color, description = EXCLUDED.description;

-- Core Buildings
INSERT INTO costudy.buildings (id, district_id, slug, name, category, prerequisite_building_ids, total_nodes, icon, position_x, position_y, status) VALUES
-- Web District
('bld_html', 'dist_web', 'html-building', 'HTML Building', 'Document Engineering', '{}', 6, 'FileCode', 580, 80, 'AVAILABLE'),
('bld_css', 'dist_web', 'css-building', 'CSS Building', 'Visual Design Systems', '{"bld_html"}', 6, 'Palette', 640, 80, 'AVAILABLE'),
('bld_javascript', 'dist_web', 'javascript-building', 'JavaScript Building', 'Interactive Client Systems', '{"bld_html","bld_css"}', 8, 'Zap', 580, 140, 'AVAILABLE'),
('bld_typescript', 'dist_web', 'typescript-building', 'TypeScript Building', 'Typed Web Applications', '{"bld_javascript"}', 6, 'Shield', 640, 140, 'AVAILABLE'),
('bld_react', 'dist_web', 'react-building', 'React Building', 'Component Architecture', '{"bld_javascript"}', 6, 'Layers', 580, 200, 'AVAILABLE'),
('bld_nodejs', 'dist_web', 'nodejs-building', 'Node.js Building', 'Server Runtimes & APIs', '{"bld_javascript"}', 6, 'Server', 640, 200, 'AVAILABLE'),

-- Programming District
('bld_c', 'dist_programming', 'c-building', 'C Building', 'Systems Programming', '{}', 6, 'Terminal', 340, 80, 'AVAILABLE'),
('bld_cpp', 'dist_programming', 'cpp-building', 'C++ Building', 'Object Oriented Programming', '{"bld_c"}', 6, 'Boxes', 400, 80, 'AVAILABLE'),
('bld_java', 'dist_programming', 'java-building', 'Java Building', 'Enterprise Computing', '{}', 6, 'Coffee', 340, 140, 'AVAILABLE'),
('bld_python', 'dist_programming', 'python-building', 'Python Building', 'Automation & Scripting', '{}', 6, 'FileCode2', 400, 140, 'AVAILABLE'),
('bld_dsa', 'dist_programming', 'dsa-building', 'Data Structures Building', 'Memory & Organization', '{"bld_c","bld_cpp"}', 8, 'GitCommit', 340, 200, 'AVAILABLE'),
('bld_algo', 'dist_programming', 'algo-building', 'Algorithms Building', 'Computational Complexity', '{"bld_dsa"}', 8, 'Compass', 400, 200, 'AVAILABLE'),

-- Database District
('bld_sql', 'dist_db', 'sql-building', 'SQL Building', 'Relational Query Language', '{}', 6, 'Search', 100, 300, 'AVAILABLE'),
('bld_dbms', 'dist_db', 'dbms-building', 'DBMS Building', 'Database Engine Foundations', '{"bld_sql"}', 6, 'Database', 160, 300, 'AVAILABLE'),
('bld_postgres', 'dist_db', 'postgres-building', 'PostgreSQL Building', 'Advanced Relational Store', '{"bld_sql"}', 6, 'HardDrive', 100, 360, 'AVAILABLE'),
('bld_redis', 'dist_db', 'redis-building', 'Redis Building', 'In-Memory Caching & Streams', '{}', 6, 'Zap', 160, 360, 'AVAILABLE'),

-- AI District
('bld_math_ai', 'dist_ai', 'math-ai-building', 'Mathematics for AI', 'Linear Algebra & Calculus', '{}', 6, 'Sigma', 340, 520, 'AVAILABLE'),
('bld_ml', 'dist_ai', 'ml-building', 'Machine Learning Building', 'Statistical Models', '{"bld_math_ai","bld_python"}', 8, 'BrainCircuit', 400, 520, 'AVAILABLE'),
('bld_deep_learning', 'dist_ai', 'deep-learning-building', 'Deep Learning Building', 'Neural Architectures', '{"bld_ml"}', 8, 'Sparkles', 340, 580, 'AVAILABLE'),
('bld_llm_rag', 'dist_ai', 'llm-rag-building', 'LLMs & RAG Building', 'Generative Intelligence', '{"bld_deep_learning"}', 6, 'MessageSquare', 400, 580, 'AVAILABLE'),

-- Cloud & DevOps
('bld_docker', 'dist_cloud', 'docker-building', 'Docker Building', 'Container Virtualization', '{}', 6, 'Box', 580, 520, 'AVAILABLE'),
('bld_k8s', 'dist_cloud', 'k8s-building', 'Kubernetes Building', 'Cluster Orchestration', '{"bld_docker"}', 8, 'Navigation', 640, 520, 'AVAILABLE'),
('bld_aws', 'dist_cloud', 'aws-building', 'AWS Building', 'Cloud Infrastructure', '{}', 8, 'Cloud', 580, 580, 'AVAILABLE'),

-- Systems & Cybersecurity
('bld_os', 'dist_cs', 'os-building', 'Operating Systems Building', 'Kernels & Process Scheduling', '{"bld_c"}', 8, 'Settings', 820, 80, 'AVAILABLE'),
('bld_networks', 'dist_net', 'networks-building', 'Computer Networks Building', 'OSI & TCP/IP Stack', '{}', 8, 'Wifi', 340, 300, 'AVAILABLE'),
('bld_soc', 'dist_security', 'soc-building', 'SOC Security Center', 'Incident Response & Threat Intel', '{"bld_networks"}', 6, 'ShieldAlert', 220, 740, 'AVAILABLE'),

-- Career Portals
('bld_career_frontend', 'dist_career', 'career-frontend', 'Frontend Engineer Arena', 'Client Engineering Capstone', '{"bld_html","bld_css","bld_javascript","bld_react"}', 4, 'Layout', 700, 740, 'AVAILABLE'),
('bld_career_backend', 'dist_career', 'career-backend', 'Backend Engineer Arena', 'APIs, DBs & Scalability Capstone', '{"bld_nodejs","bld_sql","bld_docker"}', 4, 'Server', 760, 740, 'AVAILABLE')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category;

-- Universal Subjects
INSERT INTO costudy.subjects (id, building_id, slug, name, description, syllabus_code, icon) VALUES
('sub_math1', 'bld_c', 'math1', 'Engineering Mathematics I', 'Calculus, Matrices and Differential Equations.', 'BS-MA101', 'Sigma'),
('sub_physics', 'bld_c', 'physics', 'Engineering Physics', 'Optics, Electromagnetism and Quantum Mechanics.', 'BS-PH101', 'Zap'),
('sub_c_prog', 'bld_c', 'c-programming', 'Programming Fundamentals (C)', 'Variables, Control Flow, Pointers and Memory.', 'ES-CS101', 'Terminal'),
('sub_html', 'bld_html', 'html-foundations', 'HTML & Web Document Engineering', 'Semantic Markup, Forms, DOM and Accessibility.', 'CS-WEB101', 'FileCode'),
('sub_css', 'bld_css', 'css-mastery', 'Modern CSS & Visual Styling', 'Flexbox, Grid, Responsive Design and Animations.', 'CS-WEB102', 'Palette'),
('sub_javascript', 'bld_javascript', 'javascript-core', 'JavaScript & Interactive Web', 'Closures, Prototypes, Asynchronous I/O and DOM.', 'CS-WEB201', 'Zap'),
('sub_dsa', 'bld_dsa', 'data-structures', 'Data Structures & Algorithms', 'Stacks, Queues, Linked Lists, Trees and Graphs.', 'PC-CS301', 'GitCommit'),
('sub_dbms', 'bld_dbms', 'dbms', 'Database Management Systems', 'Relational Algebra, SQL, Normalization and Transactions.', 'PC-CS401', 'Database'),
('sub_os', 'bld_os', 'operating-systems', 'Operating Systems', 'Processes, Threads, Memory Management and File Systems.', 'PC-CS402', 'Settings'),
('sub_cn', 'bld_networks', 'computer-networks', 'Computer Networks', 'OSI Layering, TCP/UDP, IP Addressing and Routing.', 'PC-CS501', 'Wifi'),
('sub_ai', 'bld_ml', 'artificial-intelligence', 'Artificial Intelligence & ML', 'Search Algorithms, Supervised Learning and Neural Networks.', 'PC-CS601', 'BrainCircuit'),
('sub_cloud', 'bld_aws', 'cloud-devops', 'Cloud Computing & DevOps', 'Virtualization, Containers, CI/CD and Microservices.', 'PE-CS701', 'Cloud')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- B.Tech CSE 8-Semester Curriculum Mappings
INSERT INTO costudy.curriculum_mappings (id, university_name, degree, year_number, semester_number, subject_id, subject_title, is_core, credits) VALUES
('curr_s1_math1', 'Universal Academic Standard', 'B.Tech CSE', 1, 1, 'sub_math1', 'Engineering Mathematics I', TRUE, 4),
('curr_s1_phys', 'Universal Academic Standard', 'B.Tech CSE', 1, 1, 'sub_physics', 'Engineering Physics', TRUE, 4),
('curr_s1_c', 'Universal Academic Standard', 'B.Tech CSE', 1, 1, 'sub_c_prog', 'Programming Fundamentals (C)', TRUE, 4),
('curr_s1_html', 'Universal Academic Standard', 'B.Tech CSE', 1, 1, 'sub_html', 'HTML & Document Engineering', TRUE, 3),

('curr_s2_css', 'Universal Academic Standard', 'B.Tech CSE', 1, 2, 'sub_css', 'Modern CSS & Visual Styling', TRUE, 3),
('curr_s2_c_adv', 'Universal Academic Standard', 'B.Tech CSE', 1, 2, 'sub_c_prog', 'Advanced Data Organization in C', TRUE, 4),

('curr_s3_dsa', 'Universal Academic Standard', 'B.Tech CSE', 2, 3, 'sub_dsa', 'Data Structures & Algorithms', TRUE, 4),
('curr_s3_js', 'Universal Academic Standard', 'B.Tech CSE', 2, 3, 'sub_javascript', 'JavaScript & Interactive Web', TRUE, 3),

('curr_s4_dbms', 'Universal Academic Standard', 'B.Tech CSE', 2, 4, 'sub_dbms', 'Database Management Systems', TRUE, 4),
('curr_s4_os', 'Universal Academic Standard', 'B.Tech CSE', 2, 4, 'sub_os', 'Operating Systems', TRUE, 4),

('curr_s5_cn', 'Universal Academic Standard', 'B.Tech CSE', 3, 5, 'sub_cn', 'Computer Networks', TRUE, 4),

('curr_s6_ai', 'Universal Academic Standard', 'B.Tech CSE', 3, 6, 'sub_ai', 'Artificial Intelligence & ML', TRUE, 4),

('curr_s7_cloud', 'Universal Academic Standard', 'B.Tech CSE', 4, 7, 'sub_cloud', 'Cloud Computing & DevOps', TRUE, 4),

('curr_s8_capstone', 'Universal Academic Standard', 'B.Tech CSE', 4, 8, 'sub_html', 'Industry Capstone & Portfolio', TRUE, 6)
ON CONFLICT (id) DO UPDATE SET subject_title = EXCLUDED.subject_title, credits = EXCLUDED.credits;

-- HTML Reference Subject: 6 Campus Roadmap Nodes
INSERT INTO costudy.learning_nodes (id, subject_id, node_order, slug, title, location_type, description, estimated_minutes) VALUES
('node_html_01', 'sub_html', 1, 'reception-architecture', 'HTML Architecture & Document Anatomy', 'RECEPTION', 'Enter the Web Studio reception to study DOCTYPE, document trees, and head metadata.', 20),
('node_html_02', 'sub_html', 2, 'elements-lab-text', 'Elements Lab: Text, Lists & Hypertext', 'ELEMENTS LAB', 'Construct typographic hierarchy, organized lists, and anchor hyperlinks.', 25),
('node_html_03', 'sub_html', 3, 'forms-workshop', 'Forms Workshop: Inputs, Validation & State', 'FORMS WORKSHOP', 'Engineer accessible input fields, labels, submit controls, and form validation attributes.', 30),
('node_html_04', 'sub_html', 4, 'semantic-arena', 'Semantic Arena: Layout Landmarks', 'SEMANTIC ARENA', 'Build structural layout landmarks with header, nav, main, article, section, and footer.', 30),
('node_html_05', 'sub_html', 5, 'media-studio', 'Media Studio: Responsive Images & Video', 'MEDIA STUDIO', 'Embed responsive imagery with srcset, picture tags, captions, and accessible media controls.', 25),
('node_html_06', 'sub_html', 6, 'accessibility-tower', 'Accessibility Tower: ARIA & Screen Readers', 'ACCESSIBILITY TOWER', 'Auditing WCAG contrast, ARIA landmarks, keyboard focus rings, and screen-reader readiness.', 35)
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;

-- HTML Lesson 1 Content
INSERT INTO costudy.lessons (id, node_id, title, summary, content_markdown, key_takeaways, sandbox_starter_code) VALUES
('lesson_html_01', 'node_html_01', 'HTML Document Foundation & Semantic Web Structure', 
'Learn how web browsers parse document declarations, establish DOM node trees, and construct accessible, standards-compliant pages.',
'# HTML Document Foundation & Semantic Web Structure

## 1. The Anatomy of an HTML5 Document
At the heart of every web page is a structured document tree parsed by the browser engine (such as Chromium''s Blink or Gecko). 

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CoStudy — Web Engineering</title>
  </head>
  <body>
    <header>
      <h1>Document Engineering Hub</h1>
    </header>
    <main>
      <p>Content rendered into the accessible DOM tree.</p>
    </main>
  </body>
</html>
```

## 2. Crucial Head Metadata
- `<!DOCTYPE html>`: Tells the browser engine to render in **Standard Mode**, preventing obsolete quirks mode rendering.
- `<meta charset="UTF-8">`: Declares UTF-8 character encoding, ensuring correct glyph rendering across all global languages.
- `<meta name="viewport" content="width=device-width, initial-scale=1.0">`: Sets the initial scale and width to the physical device viewport, essential for responsive layouts.

## 3. Semantic vs Generic Elements
Generic containers like `<div>` and `<span>` convey **no meaning** to screen readers or search indexers.
Semantic tags communicate structure:
- `<header>`: Introductory content or navigational aid.
- `<nav>`: Primary navigation links.
- `<main>`: The dominant, central topic content of the body.
- `<article>`: Self-contained composition that can stand independently.
- `<section>`: Thematic grouping of content with a heading.
- `<footer>`: Metadata, author, copyright, or footer links.',
ARRAY[
  'Always specify <!DOCTYPE html> to enforce browser standard mode.',
  'Include the viewport meta tag for responsive scaling on mobile devices.',
  'Use semantic elements (<main>, <header>, <nav>, <article>) instead of generic <div> tags.',
  'Ensure lang attribute on <html> matches document language for screen readers.'
],
'<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document Studio Preview</title>
  <style>
    body { font-family: sans-serif; background: #FAF7EE; color: #0B0B0B; padding: 20px; }
    header { border-bottom: 2px solid #0B0B0B; padding-bottom: 10px; margin-bottom: 20px; }
    h1 { margin: 0; color: #0B0B0B; }
    .badge { background: #CCFF00; border: 1.5px solid #0B0B0B; padding: 3px 8px; font-weight: bold; }
  </style>
</head>
<body>
  <header>
    <span class="badge">COSTUDY LAB</span>
    <h1>Semantic Web Foundation</h1>
  </header>
  <main>
    <p>Welcome to the CoStudy 2D Learning City Web Lab!</p>
  </main>
</body>
</html>'
)
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, content_markdown = EXCLUDED.content_markdown;

-- 4 Real-World Coding Problems for HTML Lesson 1
INSERT INTO costudy.problems (id, lesson_id, problem_order, title, difficulty, description, starter_code, test_cases_json, solution_code) VALUES
(
  'prob_html_01_skeleton',
  'lesson_html_01',
  1,
  'Problem 1: Standards-Compliant Document Skeleton',
  'BASIC',
  'Construct a clean HTML5 document skeleton containing the <!DOCTYPE html> declaration, an html tag with lang="en", head with charset UTF-8 and viewport meta, a title of "CoStudy Portal", and a body with a level 1 heading containing "Welcome to CoStudy".',
  $code$<!-- Build your standards-compliant HTML5 skeleton here -->
$code$,
  $json$[
    {"id": "t1", "description": "Includes <!DOCTYPE html> declaration", "regex": "<!DOCTYPE\\s+html>", "points": 25},
    {"id": "t2", "description": "html element has lang=\"en\"", "regex": "<html[^>]*lang=[\"']en[\"']", "points": 25},
    {"id": "t3", "description": "Contains charset=\"UTF-8\" and viewport meta tags", "regex": "charset=[\"']?UTF-8[\"']?.*name=[\"']viewport[\"']", "points": 25},
    {"id": "t4", "description": "Body contains <h1>Welcome to CoStudy</h1>", "regex": "<h1[^>]*>\\s*Welcome to CoStudy\\s*<\\/h1>", "points": 25}
  ]$json$::jsonb,
  $code$<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CoStudy Portal</title>
</head>
<body>
  <h1>Welcome to CoStudy</h1>
</body>
</html>$code$
),
(
  'prob_html_02_card',
  'lesson_html_01',
  2,
  'Problem 2: Semantic User Profile Card',
  'APPLICATION',
  'Build an accessible user profile card wrapped in an <article> element. It must include a <header> with an <h2> containing the person name "Devin Learner", a <p> with class "bio" describing their focus, an unordered list <ul> of at least 3 skills (HTML, CSS, JavaScript), and a <footer> containing a mailto link.',
  $code$<article class="profile-card">
  <!-- Construct semantic profile card here -->
</article>$code$,
  $json$[
    {"id": "t1", "description": "Root element is an <article>", "regex": "<article[^>]*class=[\"']profile-card[\"']", "points": 25},
    {"id": "t2", "description": "Contains <header> with <h2> containing Devin Learner", "regex": "<header>.*<h2[^>]*>.*Devin Learner.*<\\/h2>.*<\\/header>", "points": 25},
    {"id": "t3", "description": "Contains <ul> list with at least 3 skills", "regex": "<ul[^>]*>(?:\\s*<li[^>]*>[^<]+<\\/li>){3,}\\s*<\\/ul>", "points": 25},
    {"id": "t4", "description": "Footer contains mailto contact link", "regex": "<footer[^>]*>.*<a[^>]*href=[\"']mailto:[^\"']+[\"'].*<\\/footer>", "points": 25}
  ]$json$::jsonb,
  $code$<article class="profile-card">
  <header>
    <h2>Devin Learner</h2>
    <span class="role">Junior Software Engineer</span>
  </header>
  <p class="bio">Building high-performance web applications in the CoStudy Learning City.</p>
  <ul>
    <li>HTML5</li>
    <li>CSS3</li>
    <li>JavaScript</li>
  </ul>
  <footer>
    <a href="mailto:devin@cogether.app">Contact Devin</a>
  </footer>
</article>$code$
),
(
  'prob_html_03_form',
  'lesson_html_01',
  3,
  'Problem 3: Enterprise Job Application Form',
  'REAL_WORLD',
  'Create an enterprise job application form (<form>). It must have method="POST", action="/apply", an input for full name with matching <label for="name"> and required attribute, an email input with type="email" and matching label, a <select> for department with at least 3 options, and a submit button (<button type="submit">Submit Application</button>).',
  $code$<form action="/apply" method="POST">
  <!-- Construct validated application form with matching label/for pairs -->
</form>$code$,
  $json$[
    {"id": "t1", "description": "Form has action=\"/apply\" and method=\"POST\"", "regex": "<form[^>]*action=[\"']/apply[\"'][^>]*method=[\"']POST[\"']", "points": 25},
    {"id": "t2", "description": "Full name input has matching label with for attribute and required flag", "regex": "<label[^>]*for=[\"']name[\"'].*<input[^>]*id=[\"']name[\"'][^>]*required", "points": 25},
    {"id": "t3", "description": "Email input has type=\"email\" with matching label and required", "regex": "<label[^>]*for=[\"']email[\"'].*<input[^>]*type=[\"']email[\"'][^>]*id=[\"']email[\"']", "points": 25},
    {"id": "t4", "description": "Contains <select> department with >=3 options and a submit button", "regex": "<select[^>]*>(?:\\s*<option[^>]*>[^<]+<\\/option>){3,}\\s*<\\/select>.*<button[^>]*type=[\"']submit[\"']", "points": 25}
  ]$json$::jsonb,
  $code$<form action="/apply" method="POST">
  <div class="form-group">
    <label for="name">Full Name:</label>
    <input type="text" id="name" name="name" required placeholder="Jane Doe" />
  </div>
  <div class="form-group">
    <label for="email">Work Email:</label>
    <input type="email" id="email" name="email" required placeholder="jane@enterprise.com" />
  </div>
  <div class="form-group">
    <label for="dept">Target Department:</label>
    <select id="dept" name="department">
      <option value="frontend">Frontend Engineering</option>
      <option value="backend">Backend Engineering</option>
      <option value="devops">Cloud & DevOps</option>
    </select>
  </div>
  <button type="submit">Submit Application</button>
</form>$code$
),
(
  'prob_html_04_reader',
  'lesson_html_01',
  4,
  'Problem 4: Accessible Semantic Reader with ARIA Landmarks',
  'HARD',
  'Construct a complete semantic article reader. It must feature: 1) A <header> with <nav aria-label="Breadcrumb">; 2) A <main> container; 3) An <article> with an <h1> title and a <time datetime="..."> publication timestamp; 4) A <figure> element with an <img> (with meaningful alt text) and a <figcaption>; 5) An <aside aria-label="Related Articles"> section with at least two links; and 6) A <footer> with copyright info.',
  $code$<!-- Build your accessible semantic reader document here -->
$code$,
  $json$[
    {"id": "t1", "description": "Header contains <nav aria-label=\"Breadcrumb\">", "regex": "<nav[^>]*aria-label=[\"']Breadcrumb[\"']", "points": 20},
    {"id": "t2", "description": "Main contains <article> with <h1> and <time datetime=...>", "regex": "<main>.*<article>.*<h1[^>]*>.*<\\/h1>.*<time[^>]*datetime=[\"'][^\"']+[\"']>.*<\\/time>", "points": 20},
    {"id": "t3", "description": "Contains <figure> with <img> (having non-empty alt) and <figcaption>", "regex": "<figure>.*<img[^>]*alt=[\"'][^\"']+[\"'][^>]*>.*<figcaption>.*<\\/figcaption>.*<\\/figure>", "points": 20},
    {"id": "t4", "description": "Contains <aside aria-label=\"Related Articles\"> with 2 links", "regex": "<aside[^>]*aria-label=[\"']Related Articles[\"']>.*<a[^>]*>.*<\\/a>.*<a[^>]*>.*<\\/a>.*<\\/aside>", "points": 20},
    {"id": "t5", "description": "Includes semantic <footer> with copyright notice", "regex": "<footer[^>]*>.*(?:&copy;|©|Copyright).*<\\/footer>", "points": 20}
  ]$json$::jsonb,
  $code$<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Engineering Gazette — CoStudy</title>
</head>
<body>
  <header>
    <nav aria-label="Breadcrumb">
      <a href="/">Home</a> / <a href="/web">Web District</a> / <span>Article</span>
    </nav>
  </header>
  <main>
    <article>
      <h1>The Architecture of Semantic Web Accessibility</h1>
      <p>Published on <time datetime="2026-09-16">September 16, 2026</time> by Lead Architect</p>
      <p>Semantic document structures empower assistive technology and search crawlers to navigate content with precision.</p>
      <figure>
        <img src="/costudy_illustration.jpg" alt="Collaborative learning city map architecture diagram" />
        <figcaption>Figure 1.1: Document node tree visualization in modern browser engines.</figcaption>
      </figure>
      <p>By relying on native landmark roles, developers minimize boilerplate and improve user experience.</p>
    </article>
    <aside aria-label="Related Articles">
      <h3>Related Research</h3>
      <ul>
        <li><a href="/articles/css-grid">CSS Grid Layout Systems</a></li>
        <li><a href="/articles/wai-aria">WAI-ARIA Authoring Practices</a></li>
      </ul>
    </aside>
  </main>
  <footer>
    <p>&copy; 2026 CoStudy Education World. All rights reserved.</p>
  </footer>
</body>
</html>$code$
)
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, starter_code = EXCLUDED.starter_code, test_cases_json = EXCLUDED.test_cases_json;

-- Themed Enterprise Quest for HTML
INSERT INTO costudy.quests (id, subject_id, title, theme_name, brief, objective, reward_xp, badge_title) VALUES
(
  'quest_html_studio',
  'sub_html',
  'Web Design Studio: Enterprise Portal Architecture',
  'WEB DESIGN STUDIO',
  'You have been appointed as Lead Web Architect at NovaCorp Digital. The legacy portal suffers from 100% div-soup, zero accessibility landmarks, and fails WCAG 2.1 compliance audits.',
  'Rebuild the enterprise client portal into an accessible, semantic web application adhering to HTML5 standards, ARIA landmark guidelines, and validated form pipelines.',
  350,
  'Certified Web Document Architect'
)
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, brief = EXCLUDED.brief;
