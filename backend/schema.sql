CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  company VARCHAR(150) NOT NULL,
  role VARCHAR(150) NOT NULL,
  location VARCHAR(150) DEFAULT '',
  job_url TEXT DEFAULT '',
  salary_range VARCHAR(100) DEFAULT '',
  status VARCHAR(30) NOT NULL DEFAULT 'Applied'
    CHECK (status IN ('Wishlist', 'Applied', 'Screening', 'Interview', 'Offer', 'Rejected', 'Withdrawn')),
  applied_date DATE DEFAULT CURRENT_DATE,
  interview_date DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_company ON applications(company);
