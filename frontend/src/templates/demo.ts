/**
 * The sample resumes shown in the creation dialog.
 *
 * One persona per template (19, matching TEMPLATE_PRESETS in factories.ts),
 * each a distinct professional field written to exercise that template's
 * design intent, and each written with enough real content (multiple roles,
 * full bullet counts, filled-out skills/certs/languages) to show how the
 * template holds up at realistic density, not a stub.
 */

import type { ResumeDocument, TemplateId } from '../types'
import { applyTemplatePreset } from '../factories'

const DEFAULT_SETTINGS: ResumeDocument['settings'] = {
  template: 'classic-pro',
  accentColor: '#374151',
  fontFamily: 'Georgia',
  fontSize: 10.5,
  lineHeight: 1.4,
  sectionSpacing: 1,
  marginX: 15,
  marginY: 14,
  paperSize: 'A4',
  showPhoto: true,
  showIcons: false,
  nameSize: null,
  titleSize: null,
  headingSize: null,
  entrySize: null,
  contactSize: null,
  columnLayout: 'one',
  headerPosition: 'top',
  columnWidth: 40,
  leftColumn: [],
  rightColumn: [],
  photoLayout: {
    show: true, grayscale: false, position: 'left', size: 24, shape: 'circle',
    focusX: 50, focusY: 50, zoom: 1, border: false, borderWidth: 1, borderColor: '#000000',
  },
  headingStyle: { visual: 'underline', capitalization: 'uppercase', showIcons: true, iconStyle: 'filled' },
}

const NO_PHOTO: ResumeDocument['settings'] = { ...DEFAULT_SETTINGS, showPhoto: false }

const PHOTOS = ['/id_model_agenticv1.png', '/id_model_agenticv2.png', '/id_model_agenticv3.png', '/id_model_agenticv4.jpg']

// =============================================================================
// 1. ats-classic - Marketing Manager
// =============================================================================
const MARKETING_MANAGER: ResumeDocument = {
  basics: {
    fullName: 'Priya Nair', headline: 'Marketing Manager',
    email: 'priya.nair@example.com', phone: '+91 98450 33210', location: 'Mumbai, India',
    website: 'priyanair.com', photoUrl: '', summary: '',
    links: [{ id: 'l1', label: 'LinkedIn', url: 'linkedin.com/in/priyanair' }],
  },
  sections: [
    { id: 's-sum', title: 'Summary', visible: true, type: 'summary', items: [{ id: 'i-sum', visible: true,
      summary: 'Marketing manager with eight years driving demand generation and brand growth for B2B SaaS companies. Built and scaled paid, organic, and lifecycle programs from the ground up across three organizations. Comfortable owning a marketing P&L, briefing a creative agency, and reading a cohort retention curve in the same afternoon.' }] },
    { id: 's-exp', title: 'Work Experience', visible: true, type: 'experience', items: [
      { id: 'i-e1', visible: true, position: 'Marketing Manager', company: 'Kestrel Analytics', location: 'Mumbai', startDate: '2021', endDate: '', current: true,
        bullets: [
          'Grew qualified pipeline 64% year over year by rebuilding the demand generation funnel across paid search, LinkedIn, and webinars.',
          'Managed an annual marketing budget of 2.4 crore rupees across five channels with consistent CAC reduction every quarter.',
          'Led a team of four marketers and two contract designers, introducing weekly experiment reviews that doubled the team\'s testing velocity.',
          'Rebuilt the company website and core landing pages, lifting organic conversion rate from 1.8% to 3.4%.',
          'Partnered with product and sales leadership to launch a customer advisory board that now informs the roadmap and produces case studies.',
        ] },
      { id: 'i-e2', visible: true, position: 'Senior Marketing Associate', company: 'Havelock Software', location: 'Pune', startDate: '2018', endDate: '2021', current: false,
        bullets: [
          'Owned email lifecycle marketing for an 80,000 subscriber base, lifting trial to paid conversion by 18%.',
          'Launched the company\'s first customer marketing program, producing twelve case studies now used across sales.',
          'Coordinated three annual industry conference sponsorships, generating over 400 qualified leads each year.',
        ] },
      { id: 'i-e3', visible: true, position: 'Marketing Coordinator', company: 'Brightfield Media', location: 'Mumbai', startDate: '2016', endDate: '2018', current: false,
        bullets: [
          'Supported a five person marketing team on content production, social scheduling, and campaign reporting.',
          'Managed the company blog editorial calendar, growing monthly readership from 6,000 to 22,000.',
        ] },
    ] },
    { id: 's-edu', title: 'Education', visible: true, type: 'education', items: [
      { id: 'i-edu1', visible: true, degree: 'MBA, Marketing', institution: 'Narsee Monjee Institute of Management Studies', location: 'Mumbai', startDate: '2016', endDate: '2018', grade: '', bullets: [] },
      { id: 'i-edu2', visible: true, degree: 'B.Com', institution: 'University of Mumbai', location: 'Mumbai', startDate: '2013', endDate: '2016', grade: '', bullets: [] },
    ] },
    { id: 's-skill', title: 'Skills', visible: true, type: 'skills', layout: 'inline', marker: 'bullet', columns: 2, items: [
      { id: 'i-sk1', visible: true, category: 'Growth', skills: ['SEO and SEM', 'Marketing automation', 'A/B testing', 'Lifecycle marketing', 'Content strategy'] },
      { id: 'i-sk2', visible: true, category: 'Tools', skills: ['HubSpot', 'Google Analytics', 'Salesforce', 'Looker', 'Webflow'] },
      { id: 'i-sk3', visible: true, category: 'Leadership', skills: ['Team management', 'Budget planning', 'Agency management'] },
    ] },
    { id: 's-cert', title: 'Certifications', visible: true, type: 'certifications', items: [
      { id: 'i-c1', visible: true, name: 'HubSpot Inbound Marketing Certification', issuer: 'HubSpot Academy', date: '2022', url: '' },
      { id: 'i-c2', visible: true, name: 'Google Analytics Individual Qualification', issuer: 'Google', date: '2020', url: '' },
    ] },
    { id: 's-lang', title: 'Languages', visible: true, type: 'languages', items: [
      { id: 'i-ln1', visible: true, name: 'English', proficiency: 'Fluent' },
      { id: 'i-ln2', visible: true, name: 'Hindi', proficiency: 'Native' },
    ] },
  ],
  settings: NO_PHOTO,
}

// =============================================================================
// 2. ats-modern - Data Analyst
// =============================================================================
const DATA_ANALYST: ResumeDocument = {
  basics: {
    fullName: 'Rohan Verma', headline: 'Data Analyst',
    email: 'rohan.verma@example.com', phone: '+91 90210 55678', location: 'Bengaluru, India',
    website: 'rohanverma.dev', photoUrl: '', summary: '',
    links: [{ id: 'l1', label: 'GitHub', url: 'github.com/rohanverma' }],
  },
  sections: [
    { id: 's-sum', title: 'Summary', visible: true, type: 'summary', items: [{ id: 'i-sum', visible: true,
      summary: 'Data analyst with six years turning messy operational data into decisions leadership actually acts on. Strong in SQL, Python, and dashboarding, with a track record of owning a metric from raw table to executive ready chart. Enjoys the unglamorous work of fixing broken pipelines as much as building new models.' }] },
    { id: 's-exp', title: 'Work Experience', visible: true, type: 'experience', items: [
      { id: 'i-e1', visible: true, position: 'Data Analyst', company: 'Meridian Retail', location: 'Bengaluru', startDate: '2022', endDate: '', current: true,
        bullets: [
          'Built the company\'s first unified sales dashboard in Looker, replacing six separate spreadsheets and a weekly manual pull.',
          'Identified a pricing anomaly costing the business 40 lakh rupees per quarter, with a fix shipped within two weeks of the finding.',
          'Automated a daily ETL pipeline in Python and SQL, cutting report turnaround from two days to twenty minutes.',
          'Built a customer churn model in scikit-learn now used by the retention team to prioritize outreach.',
          'Trained eight non-technical stakeholders on self-serve dashboard use, reducing ad hoc report requests by half.',
        ] },
      { id: 'i-e2', visible: true, position: 'Junior Data Analyst', company: 'Fenwick Logistics', location: 'Hyderabad', startDate: '2020', endDate: '2022', current: false,
        bullets: [
          'Maintained core reporting for a 200 vehicle fleet, reducing query runtime 70% by rewriting core joins.',
          'Partnered with operations to design KPIs now used company wide for route efficiency.',
          'Built a weekly executive summary deck, replacing three separate reports previously compiled by hand.',
        ] },
      { id: 'i-e3', visible: true, position: 'Data Analytics Intern', company: 'Corvid Insights', location: 'Bengaluru', startDate: '2019', endDate: '2020', current: false,
        bullets: [
          'Cleaned and validated a 2 million row customer transaction dataset used in a churn analysis project.',
        ] },
    ] },
    { id: 's-edu', title: 'Education', visible: true, type: 'education', items: [
      { id: 'i-edu1', visible: true, degree: 'B.Tech, Computer Science', institution: 'VIT Vellore', location: 'Vellore', startDate: '2016', endDate: '2020', grade: '8.7 CGPA', bullets: [] },
    ] },
    { id: 's-skill', title: 'Skills', visible: true, type: 'skills', layout: 'inline', marker: 'bullet', columns: 2, items: [
      { id: 'i-sk1', visible: true, category: 'Languages', skills: ['SQL', 'Python', 'R'] },
      { id: 'i-sk2', visible: true, category: 'Tools', skills: ['Looker', 'Tableau', 'dbt', 'Airflow', 'Excel'] },
      { id: 'i-sk3', visible: true, category: 'Methods', skills: ['Statistical modeling', 'A/B testing', 'ETL design'] },
    ] },
    { id: 's-cert', title: 'Certifications', visible: true, type: 'certifications', items: [
      { id: 'i-c1', visible: true, name: 'Google Data Analytics Professional Certificate', issuer: 'Google', date: '2021', url: '' },
      { id: 'i-c2', visible: true, name: 'SQL for Data Science', issuer: 'Coursera', date: '2020', url: '' },
    ] },
  ],
  settings: NO_PHOTO,
}

// =============================================================================
// 3. classic-pro - Management Consultant
// =============================================================================
const CONSULTANT_CLASSIC: ResumeDocument = {
  basics: {
    fullName: 'Kabir Sethi', headline: 'Management Consultant',
    email: 'kabir.sethi@example.com', phone: '+91 98110 44321', location: 'Delhi, India',
    website: '', photoUrl: '', summary: '',
    links: [{ id: 'l1', label: 'LinkedIn', url: 'linkedin.com/in/kabirsethi' }],
  },
  sections: [
    { id: 's-sum', title: 'Summary', visible: true, type: 'summary', items: [{ id: 'i-sum', visible: true,
      summary: 'Strategy consultant with seven years advising Fortune 500 clients on operating model redesign and cost transformation. MBA trained, with workstreams responsible for over 30 million dollars in identified savings across retail and manufacturing engagements. Comfortable leading a client steering committee and building the underlying model at 11pm the night before.' }] },
    { id: 's-exp', title: 'Work Experience', visible: true, type: 'experience', items: [
      { id: 'i-e1', visible: true, position: 'Senior Consultant', company: 'Braxton and Hale Advisory', location: 'Delhi', startDate: '2021', endDate: '', current: true,
        bullets: [
          'Led a twelve week operating model redesign for a 2 billion dollar retailer, delivering 18 million dollars in identified annual savings.',
          'Managed a team of three analysts across two concurrent client engagements in retail and manufacturing.',
          'Built the firm\'s standard cost transformation framework, now used across four practice areas.',
          'Presented final recommendations directly to client CEOs and boards on six engagements.',
          'Mentored two incoming analysts through their first ninety days, both promoted within a year.',
        ] },
      { id: 'i-e2', visible: true, position: 'Consultant', company: 'Ferro Partners', location: 'Mumbai', startDate: '2018', endDate: '2021', current: false,
        bullets: [
          'Delivered supply chain diagnostics for six manufacturing clients across India and Southeast Asia.',
          'Developed a pricing elasticity model adopted as the client\'s standard planning tool.',
          'Ran primary research interviews with over sixty stakeholders across three market entry studies.',
        ] },
      { id: 'i-e3', visible: true, position: 'Business Analyst', company: 'Ferro Partners', location: 'Mumbai', startDate: '2016', endDate: '2018', current: false,
        bullets: [
          'Supported due diligence on four mid market acquisitions, building financial models used in final investment decisions.',
        ] },
    ] },
    { id: 's-edu', title: 'Education', visible: true, type: 'education', items: [
      { id: 'i-edu1', visible: true, degree: 'MBA', institution: 'Indian Institute of Management, Ahmedabad', location: 'Ahmedabad', startDate: '2016', endDate: '2018', grade: '', bullets: [] },
      { id: 'i-edu2', visible: true, degree: 'B.E., Mechanical Engineering', institution: 'BITS Pilani', location: 'Pilani', startDate: '2012', endDate: '2016', grade: '', bullets: [] },
    ] },
    { id: 's-skill', title: 'Skills', visible: true, type: 'skills', layout: 'inline', marker: 'bullet', columns: 2, items: [
      { id: 'i-sk1', visible: true, category: 'Core', skills: ['Operating model design', 'Cost transformation', 'Due diligence', 'Market entry strategy'] },
      { id: 'i-sk2', visible: true, category: 'Tools', skills: ['Excel and VBA', 'PowerPoint', 'SQL', 'Tableau'] },
    ] },
    { id: 's-lang', title: 'Languages', visible: true, type: 'languages', items: [
      { id: 'i-ln1', visible: true, name: 'English', proficiency: 'Fluent' },
      { id: 'i-ln2', visible: true, name: 'Hindi', proficiency: 'Native' },
    ] },
  ],
  settings: NO_PHOTO,
}

// =============================================================================
// 4. modern-min - Product Manager
// =============================================================================
const PRODUCT_MANAGER: ResumeDocument = {
  basics: {
    fullName: 'Sana Iqbal', headline: 'Product Manager',
    email: 'sana.iqbal@example.com', phone: '+91 99870 12456', location: 'Bengaluru, India',
    website: 'sanaiqbal.co', photoUrl: '', summary: '',
    links: [{ id: 'l1', label: 'LinkedIn', url: 'linkedin.com/in/sanaiqbal' }],
  },
  sections: [
    { id: 's-sum', title: 'Summary', visible: true, type: 'summary', items: [{ id: 'i-sum', visible: true,
      summary: 'Product manager with seven years shipping consumer fintech features end to end. Comfortable running discovery, writing specs, sitting in the daily standup, and reading the funnel drop off the morning after launch. Believes the best roadmap is the one the whole team actually believes in.' }] },
    { id: 's-exp', title: 'Work Experience', visible: true, type: 'experience', items: [
      { id: 'i-e1', visible: true, position: 'Senior Product Manager', company: 'Rupee Labs', location: 'Bengaluru', startDate: '2021', endDate: '', current: true,
        bullets: [
          'Own the savings product line serving 6 million monthly active users, shipped auto save which lifted deposit volume 27% in one quarter.',
          'Ran the discovery process that killed a planned 2 million dollar feature before build, saving the roadmap slot for a bet that shipped and outperformed projections.',
          'Partner directly with design and engineering leads, the team ships on a two week cadence with under 5% rollback rate.',
          'Introduced a quarterly customer interview program now standard across all four product pods.',
          'Own the product analytics stack in Amplitude, built the dashboards the leadership team reviews weekly.',
        ] },
      { id: 'i-e2', visible: true, position: 'Product Manager', company: 'Northgate Fintech', location: 'Pune', startDate: '2019', endDate: '2021', current: false,
        bullets: [
          'Launched the company\'s first KYC self serve flow, cutting onboarding time from three days to six hours.',
          'Led a cross functional team of six through a full redesign of the account opening experience.',
          'Managed the product backlog for three concurrent workstreams during a period of rapid company growth.',
        ] },
      { id: 'i-e3', visible: true, position: 'Associate Product Manager', company: 'Northgate Fintech', location: 'Pune', startDate: '2017', endDate: '2019', current: false,
        bullets: [
          'Ran user research for the company\'s first mobile app redesign, informing a navigation overhaul that improved task completion by 34%.',
        ] },
    ] },
    { id: 's-edu', title: 'Education', visible: true, type: 'education', items: [
      { id: 'i-edu1', visible: true, degree: 'B.Tech, Computer Science', institution: 'Manipal Institute of Technology', location: 'Manipal', startDate: '2013', endDate: '2017', grade: '', bullets: [] },
    ] },
    { id: 's-skill', title: 'Skills', visible: true, type: 'skills', layout: 'inline', marker: 'bullet', columns: 2, items: [
      { id: 'i-sk1', visible: true, category: 'Product', skills: ['Discovery', 'Roadmapping', 'A/B testing', 'SQL', 'User research'] },
      { id: 'i-sk2', visible: true, category: 'Tools', skills: ['Figma', 'Amplitude', 'Jira', 'Linear'] },
    ] },
  ],
  settings: NO_PHOTO,
}

// =============================================================================
// 5. executive - VP of Operations
// =============================================================================
const VP_OPERATIONS: ResumeDocument = {
  basics: {
    fullName: 'Arvind Malhotra', headline: 'VP of Operations',
    email: 'arvind.malhotra@example.com', phone: '+91 98200 77123', location: 'Gurugram, India',
    website: '', photoUrl: '', summary: '',
    links: [{ id: 'l1', label: 'LinkedIn', url: 'linkedin.com/in/arvindmalhotra' }],
  },
  sections: [
    { id: 's-sum', title: 'Summary', visible: true, type: 'summary', items: [{ id: 'i-sum', visible: true,
      summary: 'Operations executive with sixteen years scaling supply chain and fulfillment for high growth e-commerce companies. Built and led teams of over 200 people across four cities. Owns the full operating budget from the warehouse floor to the board deck, and has led two acquisition integrations from day one through full operational merge.' }] },
    { id: 's-exp', title: 'Work Experience', visible: true, type: 'experience', items: [
      { id: 'i-e1', visible: true, position: 'VP of Operations', company: 'Basilworth Commerce', location: 'Gurugram', startDate: '2019', endDate: '', current: true,
        bullets: [
          'Scaled fulfillment operations from two to eleven warehouses while cutting per order cost by 22%.',
          'Own a 180 crore rupee annual operating budget and a 240 person organization across logistics, quality, and customer operations.',
          'Sit on the executive committee, led the operational integration of two acquisitions from signing through full merge.',
          'Reduced warehouse safety incidents by 45% through a new training and audit program rolled out company wide.',
          'Negotiated logistics partner contracts that reduced last mile delivery cost by 15% across the network.',
        ] },
      { id: 'i-e2', visible: true, position: 'Director of Supply Chain', company: 'Larkspur Retail', location: 'Mumbai', startDate: '2014', endDate: '2019', current: false,
        bullets: [
          'Redesigned the national distribution network, reducing average delivery time from four days to thirty six hours.',
          'Built the company\'s first demand forecasting model, cutting inventory holding costs by 19%.',
          'Managed a team of 60 across three regional distribution centers.',
        ] },
      { id: 'i-e3', visible: true, position: 'Operations Manager', company: 'Larkspur Retail', location: 'Delhi', startDate: '2009', endDate: '2014', current: false,
        bullets: [
          'Ran daily operations for the company\'s largest fulfillment center, processing 15,000 orders per day.',
        ] },
    ] },
    { id: 's-edu', title: 'Education', visible: true, type: 'education', items: [
      { id: 'i-edu1', visible: true, degree: 'MBA, Operations', institution: 'XLRI Jamshedpur', location: 'Jamshedpur', startDate: '2007', endDate: '2009', grade: '', bullets: [] },
      { id: 'i-edu2', visible: true, degree: 'B.E., Industrial Engineering', institution: 'Delhi Technological University', location: 'Delhi', startDate: '2003', endDate: '2007', grade: '', bullets: [] },
    ] },
    { id: 's-skill', title: 'Skills', visible: true, type: 'skills', layout: 'inline', marker: 'bullet', columns: 2, items: [
      { id: 'i-sk1', visible: true, category: 'Leadership', skills: ['P&L ownership', 'Organizational design', 'M&A integration', 'Executive communication'] },
      { id: 'i-sk2', visible: true, category: 'Operations', skills: ['Supply chain strategy', 'Lean and Six Sigma', 'WMS systems', 'Demand forecasting'] },
    ] },
  ],
  settings: NO_PHOTO,
}

// =============================================================================
// 6. compact - Registered Nurse
// =============================================================================
const REGISTERED_NURSE: ResumeDocument = {
  basics: {
    fullName: 'Fatima Sheikh', headline: 'Registered Nurse, ICU',
    email: 'fatima.sheikh@example.com', phone: '+91 96540 88213', location: 'Hyderabad, India',
    website: '', photoUrl: '/id_model_agenticv5.png', summary: '',
    links: [],
  },
  sections: [
    { id: 's-sum', title: 'Summary', visible: true, type: 'summary', items: [{ id: 'i-sum', visible: true,
      summary: 'ICU certified registered nurse with ten years across critical care, emergency medicine, and general medicine. Steady under pressure and comfortable leading a shift. Trained six new hires in the last year alone and holds active BLS and ACLS certification.' }] },
    { id: 's-exp', title: 'Work Experience', visible: true, type: 'experience', items: [
      { id: 'i-e1', visible: true, position: 'ICU Staff Nurse', company: 'Sunrise Multispecialty Hospital', location: 'Hyderabad', startDate: '2020', endDate: '', current: true,
        bullets: [
          'Manage a four patient critical care load per shift with zero medication error incidents over three years.',
          'Precepted six new hire nurses through their first year ICU rotation.',
          'Serve on the unit\'s quality improvement committee, contributed to a protocol change that cut central line infections by 30%.',
          'Coordinate directly with attending physicians and respiratory therapists on ventilator management for up to four patients per shift.',
        ] },
      { id: 'i-e2', visible: true, position: 'Emergency Department Nurse', company: 'St. Xavier General Hospital', location: 'Chennai', startDate: '2017', endDate: '2020', current: false,
        bullets: [
          'Handled an average of 30 patients per shift in a Level II trauma center.',
          'Triaged incoming patients and managed acuity based prioritization during peak hours.',
          'Trained new emergency department staff on trauma protocol and rapid assessment.',
        ] },
      { id: 'i-e3', visible: true, position: 'General Ward Nurse', company: 'City Care Hospital', location: 'Chennai', startDate: '2015', endDate: '2017', current: false,
        bullets: [
          'Rotated across medicine, surgery, and post operative wards during initial residency.',
          'Administered medications and monitored recovery for a caseload of up to eight patients per shift.',
        ] },
    ] },
    { id: 's-edu', title: 'Education', visible: true, type: 'education', items: [
      { id: 'i-edu1', visible: true, degree: 'B.Sc. Nursing', institution: 'Christian Medical College', location: 'Vellore', startDate: '2011', endDate: '2015', grade: '', bullets: [] },
    ] },
    { id: 's-skill', title: 'Skills', visible: true, type: 'skills', layout: 'inline', marker: 'bullet', columns: 2, items: [
      { id: 'i-sk1', visible: true, category: 'Clinical', skills: ['Critical care', 'Ventilator management', 'IV therapy', 'Trauma triage'] },
      { id: 'i-sk2', visible: true, category: 'Systems', skills: ['Epic EMR', 'HL7'] },
    ] },
    { id: 's-cert', title: 'Certifications', visible: true, type: 'certifications', items: [
      { id: 'i-c1', visible: true, name: 'BLS and ACLS Certification', issuer: 'American Heart Association', date: '2023', url: '' },
      { id: 'i-c2', visible: true, name: 'Critical Care Nursing Certificate', issuer: 'Indian Nursing Council', date: '2019', url: '' },
      { id: 'i-c3', visible: true, name: 'Registered Nurse License', issuer: 'Telangana Nursing Council', date: '2015', url: '' },
    ] },
  ],
  settings: NO_PHOTO,
}

// =============================================================================
// 7. creative - Brand and UI Designer
// =============================================================================
const DESIGNER: ResumeDocument = {
  basics: {
    fullName: 'Leo Fernandes', headline: 'Product Designer, Brand and UI',
    email: 'hello@leofernandes.design', phone: '+91 88005 21190', location: 'Goa, India',
    website: 'leofernandes.design', photoUrl: PHOTOS[3], summary: '',
    links: [{ id: 'l1', label: 'Dribbble', url: 'dribbble.com/leofernandes' }, { id: 'l2', label: 'Instagram', url: 'instagram.com/leo.designs' }],
  },
  sections: [
    { id: 's-sum', title: 'About', visible: true, type: 'summary', items: [{ id: 'i-sum', visible: true,
      summary: 'Designer obsessed with the gap between a good idea and a shippable one. Seven years turning fuzzy briefs into interfaces people actually enjoy using, across banking, hospitality, and open source. Equally happy in a brand workshop or deep in a component library.' }] },
    { id: 's-proj', title: 'Selected Work', visible: true, type: 'projects', items: [
      { id: 'i-p1', visible: true, name: 'Northlight, banking app redesign', role: 'Lead Designer', url: 'leofernandes.design/northlight', startDate: '2023', endDate: '',
        bullets: ['Cut onboarding drop off 22% with a redesigned KYC flow used by over 2 million customers.', 'Led a full design system rebuild adopted across four product squads.'] },
      { id: 'i-p2', visible: true, name: 'Havelock Hotels, brand identity', role: 'Brand Designer', url: 'leofernandes.design/havelock', startDate: '2022', endDate: '',
        bullets: ['New identity system rolled out across fourteen properties in six countries.'] },
      { id: 'i-p3', visible: true, name: 'Fieldkit, open source design tokens', role: 'Creator', url: 'github.com/leofernandes/fieldkit', startDate: '2021', endDate: '',
        bullets: ['1,400 GitHub stars, adopted by three agencies as their internal token base.'] },
    ] },
    { id: 's-exp', title: 'Experience', visible: true, type: 'experience', items: [
      { id: 'i-e1', visible: true, position: 'Senior Product Designer', company: 'Studio Coral', location: 'Remote', startDate: '2021', endDate: '', current: true,
        bullets: ['Design lead for three fintech clients concurrently, built the studio\'s first design ops practice.', 'Mentor two junior designers on portfolio building and client presentation.'] },
      { id: 'i-e2', visible: true, position: 'Product Designer', company: 'Panorama', location: 'Bengaluru', startDate: '2018', endDate: '2021', current: false,
        bullets: ['Owned end to end design for the core booking flow, 3 million monthly sessions.', 'Ran monthly usability testing sessions that shaped two major feature launches.'] },
    ] },
    { id: 's-skill', title: 'Skills', visible: true, type: 'skills', layout: 'inline', marker: 'bullet', columns: 2, items: [
      { id: 'i-sk1', visible: true, category: 'Tools', skills: ['Figma', 'After Effects', 'Webflow', 'Framer'] },
      { id: 'i-sk2', visible: true, category: 'Practice', skills: ['Brand systems', 'Motion design', 'Design ops', 'Usability testing'] },
    ] },
  ],
  settings: DEFAULT_SETTINGS,
}

// =============================================================================
// 8. devtech - Backend Software Engineer
// =============================================================================
const ENGINEER: ResumeDocument = {
  basics: {
    fullName: 'Ananya Rao', headline: 'Senior Product Engineer',
    email: 'ananya.rao@example.com', phone: '+91 98450 11223', location: 'Bengaluru, India',
    website: 'ananyarao.dev', photoUrl: '', summary: '',
    links: [{ id: 'l1', label: 'LinkedIn', url: 'linkedin.com/in/ananyarao' }, { id: 'l2', label: 'GitHub', url: 'github.com/ananyarao' }],
  },
  sections: [
    { id: 's-sum', title: 'Summary', visible: true, type: 'summary', items: [{ id: 'i-sum', visible: true,
      summary: 'Product engineer with nine years across platform teams and zero to one products. Equally at home in a design review and a Postgres query plan, with systems in production serving forty million monthly users. Has shipped everything from payment infrastructure to internal developer tooling.' }] },
    { id: 's-exp', title: 'Work Experience', visible: true, type: 'experience', items: [
      { id: 'i-e1', visible: true, position: 'Senior Product Engineer', company: 'Northwind Labs', location: 'Bengaluru', startDate: '2021', endDate: '', current: true,
        bullets: [
          'Own the checkout platform serving 40 million monthly users and 900 crore rupees in annualized volume, lead a team of four.',
          'Cut p95 checkout latency from 2.9s to 780ms by reworking the pricing service and removing three unnecessary round trips.',
          'Drove a token driven design system across 400 screens, UI defects down 38% within two quarters.',
          'Migrated the checkout service from a monolith to an event driven architecture using Kafka, cutting deploy risk substantially.',
          'Run the on call rotation for the payments team and wrote the incident response runbook now used team wide.',
        ] },
      { id: 'i-e2', visible: true, position: 'Product Engineer', company: 'Cobalt Systems', location: 'Kochi', startDate: '2018', endDate: '2021', current: false,
        bullets: [
          'Built the analytics workspace that became the company\'s most used internal surface, ahead of features twice as old.',
          'Introduced contract tests between frontend and billing, ending a recurring class of month end incidents.',
          'Optimized the core reporting query, reducing average dashboard load time from 8s to under 1s.',
        ] },
      { id: 'i-e3', visible: true, position: 'Software Engineer', company: 'Fernpath', location: 'Remote', startDate: '2016', endDate: '2018', current: false,
        bullets: [
          'First engineering hire, took the MVP from prototype to paying customers in nine months.',
        ] },
    ] },
    { id: 's-proj', title: 'Projects', visible: true, type: 'projects', items: [
      { id: 'i-prj1', visible: true, name: 'ledgerline', role: 'Open source maintainer', url: 'github.com/ananyarao/ledgerline', startDate: '2022', endDate: '',
        bullets: ['Double entry ledger library for TypeScript, 2,100 stars, used in production by three fintechs.'] },
    ] },
    { id: 's-edu', title: 'Education', visible: true, type: 'education', items: [
      { id: 'i-edu1', visible: true, degree: 'M.Tech, Computer Science', institution: 'IIT Madras', location: 'Chennai', startDate: '2014', endDate: '2016', grade: '9.1 CGPA', bullets: [] },
      { id: 'i-edu2', visible: true, degree: 'B.E., Information Technology', institution: 'NIT Surathkal', location: 'Mangaluru', startDate: '2010', endDate: '2014', grade: '', bullets: [] },
    ] },
    { id: 's-skill', title: 'Skills', visible: true, type: 'skills', layout: 'inline', marker: 'bullet', columns: 2, items: [
      { id: 'i-sk1', visible: true, category: 'Languages', skills: ['TypeScript', 'Go', 'Python', 'SQL'] },
      { id: 'i-sk2', visible: true, category: 'Backend and data', skills: ['Postgres', 'Redis', 'Kafka', 'gRPC'] },
      { id: 'i-sk3', visible: true, category: 'Infrastructure', skills: ['Docker', 'AWS', 'Kubernetes'] },
    ] },
    { id: 's-cert', title: 'Certifications', visible: true, type: 'certifications', items: [
      { id: 'i-ct1', visible: true, name: 'AWS Solutions Architect, Professional', issuer: 'Amazon Web Services', date: '2023', url: '' },
    ] },
  ],
  settings: NO_PHOTO,
}

// =============================================================================
// 9. academic - Postdoctoral Researcher
// =============================================================================
const ACADEMIC: ResumeDocument = {
  basics: {
    fullName: 'Dr. Meera Krishnan', headline: 'Postdoctoral Researcher, Computational Biology',
    email: 'm.krishnan@example.edu', phone: '+91 90210 44567', location: 'Pune, India',
    website: 'meerakrishnan.io', photoUrl: '', summary: '',
    links: [{ id: 'l1', label: 'Google Scholar', url: 'scholar.google.com/citations?user=mkrishnan' }],
  },
  sections: [
    { id: 's-edu', title: 'Education', visible: true, type: 'education', items: [
      { id: 'i-edu1', visible: true, degree: 'Ph.D., Computational Biology', institution: 'National Centre for Biological Sciences', location: 'Bengaluru', startDate: '2018', endDate: '2023', grade: '', bullets: [] },
      { id: 'i-edu2', visible: true, degree: 'M.Sc., Bioinformatics', institution: 'University of Pune', location: 'Pune', startDate: '2015', endDate: '2017', grade: '', bullets: [] },
      { id: 'i-edu3', visible: true, degree: 'B.Sc., Biotechnology', institution: 'Fergusson College', location: 'Pune', startDate: '2012', endDate: '2015', grade: '', bullets: [] },
    ] },
    { id: 's-exp', title: 'Research Experience', visible: true, type: 'experience', items: [
      { id: 'i-e1', visible: true, position: 'Postdoctoral Researcher', company: 'Indian Institute of Science', location: 'Bengaluru', startDate: '2023', endDate: '', current: true,
        bullets: [
          'Lead a study on protein folding dynamics using molecular simulation, funded by a DBT early career grant.',
          'Supervise two graduate students, co-authored four peer reviewed papers in the past eighteen months.',
          'Present research findings at two international conferences per year on average.',
        ] },
      { id: 'i-e2', visible: true, position: 'Doctoral Researcher', company: 'NCBS', location: 'Bengaluru', startDate: '2018', endDate: '2023', current: false,
        bullets: [
          'Developed a novel sequence alignment algorithm cited in over 40 subsequent publications.',
          'Taught a graduate level course in computational methods for two consecutive years.',
        ] },
    ] },
    { id: 's-proj', title: 'Selected Publications', visible: true, type: 'projects', items: [
      { id: 'i-p1', visible: true, name: 'Krishnan et al., Folding kinetics under crowding, Nature Structural Biology', role: '', url: '', startDate: '2024', endDate: '', bullets: [] },
      { id: 'i-p2', visible: true, name: 'Krishnan and Rao, A faster alignment heuristic, Bioinformatics', role: '', url: '', startDate: '2022', endDate: '', bullets: [] },
      { id: 'i-p3', visible: true, name: 'Krishnan et al., Structural prediction at scale, PLOS Computational Biology', role: '', url: '', startDate: '2021', endDate: '', bullets: [] },
    ] },
    { id: 's-skill', title: 'Skills', visible: true, type: 'skills', layout: 'inline', marker: 'bullet', columns: 2, items: [
      { id: 'i-sk1', visible: true, category: 'Computational', skills: ['Python', 'R', 'GROMACS', 'Snakemake'] },
      { id: 'i-sk2', visible: true, category: 'Wet lab', skills: ['Protein purification', 'X-ray crystallography'] },
    ] },
    { id: 's-lang', title: 'Languages', visible: true, type: 'languages', items: [
      { id: 'i-ln1', visible: true, name: 'English', proficiency: 'Fluent' },
      { id: 'i-ln2', visible: true, name: 'Tamil', proficiency: 'Native' },
    ] },
  ],
  settings: NO_PHOTO,
}

// =============================================================================
// 10. timeline - Senior Project Manager
// =============================================================================
const PROJECT_MANAGER: ResumeDocument = {
  basics: {
    fullName: 'Naveen Chandra', headline: 'Senior Project Manager, Infrastructure',
    email: 'naveen.chandra@example.com', phone: '+91 98180 66234', location: 'Chennai, India',
    website: '', photoUrl: '', summary: '',
    links: [{ id: 'l1', label: 'LinkedIn', url: 'linkedin.com/in/naveenchandra' }],
  },
  sections: [
    { id: 's-sum', title: 'Summary', visible: true, type: 'summary', items: [{ id: 'i-sum', visible: true,
      summary: 'PMP certified project manager with fourteen years delivering infrastructure and platform migrations for enterprise clients, from 5 crore rupee rollouts to multi year, multi vendor programs. Known for keeping large, cross functional projects on schedule without burning out the team.' }] },
    { id: 's-exp', title: 'Work Experience', visible: true, type: 'experience', items: [
      { id: 'i-e1', visible: true, position: 'Senior Project Manager', company: 'Vantage Infrastructure', location: 'Chennai', startDate: '2020', endDate: '', current: true,
        bullets: [
          'Delivered a fourteen month, 22 crore rupee data center migration for a national bank with zero unplanned downtime.',
          'Manage a portfolio of four concurrent enterprise projects averaging 8 crore rupees each.',
          'Built the department\'s standard risk register template, now used across all active projects.',
        ] },
      { id: 'i-e2', visible: true, position: 'Project Manager', company: 'Solstice IT Services', location: 'Chennai', startDate: '2016', endDate: '2020', current: false,
        bullets: [
          'Ran a portfolio of six concurrent client projects averaging 3 crore rupees each.',
          'Reduced average project overrun from 18% to 6% by introducing weekly milestone reviews.',
        ] },
      { id: 'i-e3', visible: true, position: 'Associate Project Manager', company: 'Kestrel Technologies', location: 'Bengaluru', startDate: '2013', endDate: '2016', current: false,
        bullets: [
          'Coordinated vendor delivery for a national ERP rollout across forty branch offices.',
        ] },
      { id: 'i-e4', visible: true, position: 'Project Coordinator', company: 'Kestrel Technologies', location: 'Bengaluru', startDate: '2011', endDate: '2013', current: false,
        bullets: [
          'Supported scheduling and documentation for a five person infrastructure delivery team.',
        ] },
    ] },
    { id: 's-edu', title: 'Education', visible: true, type: 'education', items: [
      { id: 'i-edu1', visible: true, degree: 'B.E., Civil Engineering', institution: 'Anna University', location: 'Chennai', startDate: '2007', endDate: '2011', grade: '', bullets: [] },
    ] },
    { id: 's-skill', title: 'Skills', visible: true, type: 'skills', layout: 'inline', marker: 'bullet', columns: 2, items: [
      { id: 'i-sk1', visible: true, category: 'Delivery', skills: ['Risk management', 'Vendor management', 'Budget ownership', 'Stakeholder communication'] },
      { id: 'i-sk2', visible: true, category: 'Tools', skills: ['MS Project', 'Jira', 'Smartsheet'] },
    ] },
    { id: 's-cert', title: 'Certifications', visible: true, type: 'certifications', items: [
      { id: 'i-c1', visible: true, name: 'PMP, Project Management Professional', issuer: 'PMI', date: '2019', url: '' },
      { id: 'i-c2', visible: true, name: 'ITIL Foundation', issuer: 'Axelos', date: '2017', url: '' },
    ] },
  ],
  settings: NO_PHOTO,
}

// =============================================================================
// 11. photo-pro - Sales Director
// =============================================================================
const SALES_DIRECTOR: ResumeDocument = {
  basics: {
    fullName: 'Vikram Oberoi', headline: 'Sales Director, Enterprise Accounts',
    email: 'vikram.oberoi@example.com', phone: '+91 98330 41567', location: 'Mumbai, India',
    website: '', photoUrl: PHOTOS[2], summary: '',
    links: [{ id: 'l1', label: 'LinkedIn', url: 'linkedin.com/in/vikramoberoi' }],
  },
  sections: [
    { id: 's-sum', title: 'Summary', visible: true, type: 'summary', items: [{ id: 'i-sum', visible: true,
      summary: 'Enterprise sales leader with twelve years exceeding quota in SaaS and telecom. Built a fourteen person team from scratch and consistently closes the deals other reps could not. Comfortable running the full cycle from cold outreach to boardroom negotiation.' }] },
    { id: 's-exp', title: 'Work Experience', visible: true, type: 'experience', items: [
      { id: 'i-e1', visible: true, position: 'Sales Director', company: 'Corvus Cloud', location: 'Mumbai', startDate: '2020', endDate: '', current: true,
        bullets: [
          'Grew enterprise ARR from 4 million to 19 million dollars in three years, team consistently at 118% of quota.',
          'Closed the company\'s largest deal to date, a 2.1 million dollar multi year contract with a Fortune 500 telecom.',
          'Built and lead a team of fourteen account executives and sales development reps across three regions.',
          'Redesigned the sales onboarding program, cutting new rep ramp time from six months to ten weeks.',
        ] },
      { id: 'i-e2', visible: true, position: 'Senior Account Executive', company: 'Bellweather Systems', location: 'Delhi', startDate: '2016', endDate: '2020', current: false,
        bullets: [
          'Ranked number one of twenty two reps nationally for three consecutive years.',
          'Managed a pipeline of over sixty enterprise accounts with an average deal size of 340,000 dollars.',
        ] },
      { id: 'i-e3', visible: true, position: 'Account Executive', company: 'Bellweather Systems', location: 'Delhi', startDate: '2013', endDate: '2016', current: false,
        bullets: [
          'Exceeded quota in nine of twelve quarters during initial ramp period.',
        ] },
    ] },
    { id: 's-edu', title: 'Education', visible: true, type: 'education', items: [
      { id: 'i-edu1', visible: true, degree: 'B.B.A.', institution: 'Symbiosis International University', location: 'Pune', startDate: '2010', endDate: '2013', grade: '', bullets: [] },
    ] },
    { id: 's-skill', title: 'Skills', visible: true, type: 'skills', layout: 'inline', marker: 'bullet', columns: 2, items: [
      { id: 'i-sk1', visible: true, category: 'Sales', skills: ['Enterprise negotiation', 'Pipeline management', 'Team leadership', 'Forecasting'] },
      { id: 'i-sk2', visible: true, category: 'Tools', skills: ['Salesforce', 'Gong', 'Outreach'] },
    ] },
  ],
  settings: DEFAULT_SETTINGS,
}

// =============================================================================
// 12. portal-pro - Business Development Consultant
// =============================================================================
const CONSULTANT_PORTAL: ResumeDocument = {
  basics: {
    fullName: 'Brian T. Wayne', headline: 'Business Development Consultant',
    email: 'brian@wayne.com', phone: '+1-541-754-3010', location: 'Malibu, California',
    website: 'wayne.com', photoUrl: PHOTOS[1], summary: '',
    links: [{ id: 'l1', label: 'LinkedIn', url: 'linkedin.com/in/wayne-2345' }],
  },
  sections: [
    { id: 's-sum', title: 'Profile', visible: true, type: 'summary', items: [{ id: 'i-sum', visible: true,
      summary: 'Business development consultant with a passion for helping companies achieve their growth potential. With an MBA and nine years of experience in strategy and relationship building, I bring innovative solutions that drive measurable client success across technology and professional services.' }] },
    { id: 's-exp', title: 'Work Experience', visible: true, type: 'experience', items: [
      { id: 'i-e1', visible: true, position: 'Business Development Consultant', company: 'Appleseed Inc.', location: 'New York', startDate: '2022', endDate: '', current: true,
        bullets: [
          'Developed and implemented strategic plans resulting in a 30% increase in new business opportunities.',
          'Collaborated with cross functional teams to drive business growth and expansion into two new verticals.',
          'Established and maintained relationships with key partners, growing sales revenue by 25%.',
          'Advised leadership on go to market strategy for three new service lines.',
        ] },
      { id: 'i-e2', visible: true, position: 'Business Development Manager', company: 'Aexus', location: 'Los Angeles, USA', startDate: '2018', endDate: '2022', current: false,
        bullets: [
          'Worked closely with technology and software companies to provide expert sales outsourcing services.',
          'Built and managed dedicated sales teams across Europe, the Americas, and Asia Pacific.',
          'Contributed to Aexus Sales Outsourcing\'s track record of success acting as an extension to the sales force of over 500 vendors of software and technology products.',
        ] },
      { id: 'i-e3', visible: true, position: 'Business Development Associate', company: 'Aexus', location: 'Los Angeles, USA', startDate: '2016', endDate: '2018', current: false,
        bullets: [
          'Supported outbound campaigns for a portfolio of twelve enterprise software clients.',
        ] },
    ] },
    { id: 's-edu', title: 'Education', visible: true, type: 'education', items: [
      { id: 'i-edu1', visible: true, degree: 'Master of Business Administration', institution: 'Harvard Business School', location: 'Boston', startDate: '2016', endDate: '2018', grade: '', bullets: [] },
      { id: 'i-edu2', visible: true, degree: 'B.A., Economics', institution: 'University of California, Los Angeles', location: 'Los Angeles', startDate: '2012', endDate: '2016', grade: '', bullets: [] },
    ] },
    { id: 's-skill', title: 'Skills', visible: true, type: 'skills', layout: 'inline', marker: 'bullet', columns: 1, items: [
      { id: 'i-sk1', visible: true, category: '', skills: ['Strategic thinking and problem solving', 'Relationship building and networking', 'Sales and business development strategy', 'Team management and leadership', 'Market research and analysis'] },
    ] },
    { id: 's-lang', title: 'Languages', visible: true, type: 'languages', items: [
      { id: 'i-ln1', visible: true, name: 'English', proficiency: '5' },
      { id: 'i-ln2', visible: true, name: 'Spanish', proficiency: '4' },
    ] },
    { id: 's-award', title: 'Awards', visible: true, type: 'custom', items: [
      { id: 'i-aw1', visible: true, title: 'Outstanding Business Student Award', subtitle: 'University of Southern California', date: '2014', bullets: [] },
      { id: 'i-aw2', visible: true, title: "Dean's List", subtitle: 'University of California, Los Angeles', date: '2015 to 2016', bullets: [] },
      { id: 'i-aw3', visible: true, title: 'Top Performer Award', subtitle: 'Aexus', date: '2020', bullets: [] },
    ] },
  ],
  settings: DEFAULT_SETTINGS,
}

// =============================================================================
// 13. modern-deep - UX Designer
// =============================================================================
const UX_DESIGNER: ResumeDocument = {
  basics: {
    fullName: 'Ishaan Bhatt', headline: 'UX Designer',
    email: 'ishaan.bhatt@example.com', phone: '+91 97170 22890', location: 'Ahmedabad, India',
    website: 'ishaanbhatt.design', photoUrl: PHOTOS[0], summary: '',
    links: [{ id: 'l1', label: 'Portfolio', url: 'ishaanbhatt.design' }],
  },
  sections: [
    { id: 's-sum', title: 'Summary', visible: true, type: 'summary', items: [{ id: 'i-sum', visible: true,
      summary: 'UX designer with six years across consumer apps and internal tools. Runs research, not just Figma, every ship comes with a usability read. Has led design for both greenfield products and painful legacy redesigns.' }] },
    { id: 's-exp', title: 'Work Experience', visible: true, type: 'experience', items: [
      { id: 'i-e1', visible: true, position: 'UX Designer', company: 'Larkfield Health', location: 'Ahmedabad', startDate: '2021', endDate: '', current: true,
        bullets: [
          'Redesigned the patient intake flow, completion rate up from 61% to 89%.',
          'Run monthly usability sessions with six to eight participants, findings feed directly into sprint planning.',
          'Built and maintain the company\'s design system, used across web and two mobile apps.',
        ] },
      { id: 'i-e2', visible: true, position: 'Junior UX Designer', company: 'Pixelwave Studio', location: 'Bengaluru', startDate: '2019', endDate: '2021', current: false,
        bullets: [
          'Designed onboarding flows for four client apps launched on both iOS and Android.',
          'Ran competitive audits for six client engagements, directly informing initial design direction.',
        ] },
      { id: 'i-e3', visible: true, position: 'Design Intern', company: 'Pixelwave Studio', location: 'Bengaluru', startDate: '2018', endDate: '2019', current: false,
        bullets: [
          'Supported wireframing and prototyping for two client projects during a six month internship.',
        ] },
    ] },
    { id: 's-edu', title: 'Education', visible: true, type: 'education', items: [
      { id: 'i-edu1', visible: true, degree: 'B.Des, Interaction Design', institution: 'National Institute of Design', location: 'Ahmedabad', startDate: '2015', endDate: '2019', grade: '', bullets: [] },
    ] },
    { id: 's-skill', title: 'Skills', visible: true, type: 'skills', layout: 'inline', marker: 'bullet', columns: 2, items: [
      { id: 'i-sk1', visible: true, category: 'Design', skills: ['Wireframing', 'Prototyping', 'Design systems', 'Interaction design'] },
      { id: 'i-sk2', visible: true, category: 'Research', skills: ['Usability testing', 'User interviews', 'Competitive analysis'] },
    ] },
    { id: 's-lang', title: 'Languages', visible: true, type: 'languages', items: [
      { id: 'i-ln1', visible: true, name: 'English', proficiency: 'Fluent' },
      { id: 'i-ln2', visible: true, name: 'Gujarati', proficiency: 'Native' },
    ] },
  ],
  settings: DEFAULT_SETTINGS,
}

// =============================================================================
// 14. serif-ats - Corporate Attorney
// =============================================================================
const ATTORNEY: ResumeDocument = {
  basics: {
    fullName: 'Neha Kapoor', headline: 'Corporate Attorney',
    email: 'neha.kapoor@example.com', phone: '+91 98730 55129', location: 'Delhi, India',
    website: '', photoUrl: '', summary: '',
    links: [],
  },
  sections: [
    { id: 's-sum', title: 'Summary', visible: true, type: 'summary', items: [{ id: 'i-sum', visible: true,
      summary: 'Corporate attorney with eight years in mergers and acquisitions and commercial contracts. Advised on transactions totaling over 200 million dollars in deal value. Equally comfortable in the boardroom and the redline, and known for translating dense legal risk into a decision a business leader can act on.' }] },
    { id: 's-exp', title: 'Work Experience', visible: true, type: 'experience', items: [
      { id: 'i-e1', visible: true, position: 'Associate, Corporate and M&A', company: 'Halberd and Cross LLP', location: 'Delhi', startDate: '2020', endDate: '', current: true,
        bullets: [
          'Led due diligence and drafting on four cross border acquisitions totaling 140 million dollars in deal value.',
          'Manage a team of two junior associates on active transactions.',
          'Advise clients on regulatory compliance across three jurisdictions.',
          'Negotiated final terms on a 45 million dollar joint venture agreement.',
        ] },
      { id: 'i-e2', visible: true, position: 'Junior Associate', company: 'Whitmore Legal', location: 'Mumbai', startDate: '2017', endDate: '2020', current: false,
        bullets: [
          'Drafted and negotiated commercial contracts for a portfolio of over 30 mid market clients.',
          'Supported two IPO filings, coordinating disclosure documentation across legal and finance teams.',
        ] },
      { id: 'i-e3', visible: true, position: 'Legal Intern', company: 'Whitmore Legal', location: 'Mumbai', startDate: '2016', endDate: '2017', current: false,
        bullets: [
          'Assisted senior associates with contract review and legal research during a one year training period.',
        ] },
    ] },
    { id: 's-edu', title: 'Education', visible: true, type: 'education', items: [
      { id: 'i-edu1', visible: true, degree: 'B.A., LL.B. (Hons.)', institution: 'National Law School of India University', location: 'Bengaluru', startDate: '2011', endDate: '2016', grade: '', bullets: [] },
    ] },
    { id: 's-skill', title: 'Skills', visible: true, type: 'skills', layout: 'inline', marker: 'bullet', columns: 2, items: [
      { id: 'i-sk1', visible: true, category: 'Practice', skills: ['Mergers and acquisitions', 'Contract negotiation', 'Corporate governance', 'Regulatory compliance'] },
      { id: 'i-sk2', visible: true, category: 'Admitted', skills: ['Bar Council of Delhi'] },
    ] },
  ],
  settings: NO_PHOTO,
}

// =============================================================================
// 15. jake - the reference resume this template replicates
// =============================================================================
// Not a stand-in persona: this is the content of the original resume the design
// was measured against, so the picker card advertises the page it actually
// produces. Section order, dates, and line breaks are the reference's own --
// education newest first, two entries in date order, and skills as one line per
// category. Editing these strings edits what every preview of the design shows.
const JAKE_REFERENCE: ResumeDocument = {
  basics: {
    fullName: 'Jake Ryan', headline: '',
    email: 'jake@su.edu', phone: '123-456-7890', location: '',
    website: '', photoUrl: '', summary: '',
    // Unlabelled on purpose: the reference prints the addresses themselves,
    // where a label would print "LinkedIn" instead of "linkedin.com/in/jake".
    links: [
      { id: 'l1', label: '', url: 'linkedin.com/in/jake' },
      { id: 'l2', label: '', url: 'github.com/jake' },
    ],
  },
  sections: [
    { id: 's-edu', title: 'Education', visible: true, type: 'education', items: [
      { id: 'i-edu1', visible: true, degree: 'Bachelor of Arts in Computer Science, Minor in Business', institution: 'Southwestern University', location: 'Georgetown, TX', startDate: 'Aug. 2018', endDate: 'May 2021', grade: '', bullets: [] },
      { id: 'i-edu2', visible: true, degree: 'Associate’s in Liberal Arts', institution: 'Blinn College', location: 'Bryan, TX', startDate: 'Aug. 2014', endDate: 'May 2018', grade: '', bullets: [] },
    ] },
    { id: 's-exp', title: 'Experience', visible: true, type: 'experience', items: [
      { id: 'i-e1', visible: true, position: 'Undergraduate Research Assistant', company: 'Texas A&M University', location: 'College Station, TX', startDate: 'June 2020', endDate: '', current: true,
        bullets: [
          'Developed a REST API using FastAPI and PostgreSQL to store data from learning management systems',
          'Developed a full-stack web application using Flask, React, PostgreSQL and Docker to analyze GitHub data',
          'Explored ways to visualize GitHub collaboration in a classroom setting',
        ] },
      { id: 'i-e2', visible: true, position: 'Information Technology Support Specialist', company: 'Southwestern University', location: 'Georgetown, TX', startDate: 'Sep. 2018', endDate: '', current: true,
        bullets: [
          'Communicate with managers to set up campus computers used on campus',
          'Assess and troubleshoot computer problems brought by students, faculty and staff',
          'Maintain upkeep of computers, classroom equipment, and 200 printers across campus',
        ] },
      { id: 'i-e3', visible: true, position: 'Artificial Intelligence Research Assistant', company: 'Southwestern University', location: 'Georgetown, TX', startDate: 'May 2019', endDate: 'July 2019', current: false,
        bullets: [
          'Explored methods to generate video game dungeons based off of The Legend of Zelda',
          'Developed a game in Java to test the generated dungeons',
          'Contributed 50K+ lines of code to an established codebase via Git',
          'Conducted a human subject study to determine which video game dungeon generation technique is enjoyable',
          'Wrote an 8-page paper and gave multiple presentations on-campus',
          'Presented virtually to the World Conference on Computational Intelligence',
        ] },
    ] },
    { id: 's-proj', title: 'Projects', visible: true, type: 'projects', items: [
      { id: 'i-p1', visible: true, name: 'Gitlytics', role: 'Python, Flask, React, PostgreSQL, Docker', url: '', startDate: 'June 2020', endDate: 'Present',
        bullets: [
          'Developed a full-stack web application using with Flask serving a REST API with React as the frontend',
          'Implemented GitHub OAuth to get data from user’s repositories',
          'Visualized GitHub data to show collaboration',
          'Used Celery and Redis for asynchronous tasks',
        ] },
      { id: 'i-p2', visible: true, name: 'Simple Paintball', role: 'Spigot API, Java, Maven, TravisCI, Git', url: '', startDate: 'May 2018', endDate: 'May 2020',
        bullets: [
          'Developed a Minecraft server plugin to entertain kids during free time for a previous job',
          'Published plugin to websites gaining 2K+ downloads and an average 4.5/5-star review',
          'Implemented continuous delivery using TravisCI to build the plugin upon new a release',
          'Collaborated with Minecraft server administrators to suggest features and get feedback about the plugin',
        ] },
    ] },
    { id: 's-skill', title: 'Technical Skills', visible: true, type: 'skills', layout: 'inline', marker: 'bullet', columns: 1, items: [
      { id: 'i-sk1', visible: true, category: 'Languages', skills: ['Java', 'Python', 'C/C++', 'SQL (Postgres)', 'JavaScript', 'HTML/CSS', 'R'] },
      { id: 'i-sk2', visible: true, category: 'Frameworks', skills: ['React', 'Node.js', 'Flask', 'JUnit', 'WordPress', 'Material-UI', 'FastAPI'] },
      { id: 'i-sk3', visible: true, category: 'Developer Tools', skills: ['Git', 'Docker', 'TravisCI', 'Google Cloud Platform', 'VS Code', 'Visual Studio', 'PyCharm', 'IntelliJ', 'Eclipse'] },
      { id: 'i-sk4', visible: true, category: 'Libraries', skills: ['pandas', 'NumPy', 'Matplotlib'] },
    ] },
  ],
  settings: NO_PHOTO,
}

// =============================================================================
// 16. banner - Content and Marketing Lead
// =============================================================================
const CONTENT_LEAD: ResumeDocument = {
  basics: {
    fullName: 'Zara Ahmed', headline: 'Content and Marketing Lead',
    email: 'zara.ahmed@example.com', phone: '+91 97390 66781', location: 'Bengaluru, India',
    website: 'zaraahmed.co', photoUrl: PHOTOS[3], summary: '',
    links: [{ id: 'l1', label: 'LinkedIn', url: 'linkedin.com/in/zaraahmed' }],
  },
  sections: [
    { id: 's-sum', title: 'Summary', visible: true, type: 'summary', items: [{ id: 'i-sum', visible: true,
      summary: 'Content lead with seven years building editorial and lifecycle programs for B2B SaaS companies. Grew organic traffic from near zero to the company\'s largest acquisition channel. Believes good content marketing is just good writing pointed at the right problem.' }] },
    { id: 's-exp', title: 'Work Experience', visible: true, type: 'experience', items: [
      { id: 'i-e1', visible: true, position: 'Content and Marketing Lead', company: 'Fernglass Software', location: 'Bengaluru', startDate: '2021', endDate: '', current: true,
        bullets: [
          'Grew organic blog traffic from 4,000 to 190,000 monthly visitors in two years.',
          'Built and manage a content team of three writers and a freelance pool.',
          'Launched a customer story series that became the top performing content in the funnel.',
          'Own the content strategy behind three product launches, each exceeding traffic and signup targets.',
        ] },
      { id: 'i-e2', visible: true, position: 'Content Marketing Manager', company: 'Willowbrook Media', location: 'Mumbai', startDate: '2018', endDate: '2021', current: false,
        bullets: [
          'Launched the company newsletter, grew subscriber base to 30,000 with a 42% open rate.',
          'Managed the editorial calendar and a network of eight freelance contributors.',
        ] },
      { id: 'i-e3', visible: true, position: 'Content Writer', company: 'Willowbrook Media', location: 'Mumbai', startDate: '2016', endDate: '2018', current: false,
        bullets: [
          'Wrote and published over 200 articles across three client accounts.',
        ] },
    ] },
    { id: 's-edu', title: 'Education', visible: true, type: 'education', items: [
      { id: 'i-edu1', visible: true, degree: 'B.A., Journalism', institution: 'Symbiosis Institute of Media and Communication', location: 'Pune', startDate: '2013', endDate: '2016', grade: '', bullets: [] },
    ] },
    { id: 's-skill', title: 'Skills', visible: true, type: 'skills', layout: 'inline', marker: 'bullet', columns: 2, items: [
      { id: 'i-sk1', visible: true, category: 'Content', skills: ['SEO strategy', 'Editorial planning', 'Newsletter growth', 'Content operations'] },
      { id: 'i-sk2', visible: true, category: 'Tools', skills: ['Ahrefs', 'HubSpot', 'Webflow'] },
    ] },
  ],
  settings: DEFAULT_SETTINGS,
}

// =============================================================================
// 17. editorial - Journalist, Senior Writer
// =============================================================================
const JOURNALIST: ResumeDocument = {
  basics: {
    fullName: 'Aditi Deshmukh', headline: 'Senior Journalist, Business Desk',
    email: 'aditi.deshmukh@example.com', phone: '+91 98220 33456', location: 'Mumbai, India',
    website: 'aditideshmukh.com', photoUrl: '', summary: '',
    links: [{ id: 'l1', label: 'Portfolio', url: 'aditideshmukh.com/clips' }],
  },
  sections: [
    { id: 's-sum', title: 'Summary', visible: true, type: 'summary', items: [{ id: 'i-sum', visible: true,
      summary: 'Business journalist with ten years covering markets and corporate India. Bylines in three national dailies, broke two stories that moved same day stock prices. Comfortable working a beat for years or parachuting into a breaking story with two hours to file.' }] },
    { id: 's-exp', title: 'Work Experience', visible: true, type: 'experience', items: [
      { id: 'i-e1', visible: true, position: 'Senior Journalist, Business Desk', company: 'The Daily Compass', location: 'Mumbai', startDate: '2020', endDate: '', current: true,
        bullets: [
          'Cover markets and corporate governance, average six published pieces per week.',
          'Broke a governance story that triggered a SEBI inquiry into a listed mid cap company.',
          'Mentor two junior reporters on investigative technique and source development.',
          'Appear as a regular commentator on two business news television segments.',
        ] },
      { id: 'i-e2', visible: true, position: 'Staff Reporter', company: 'Meridian Business Standard', location: 'Delhi', startDate: '2017', endDate: '2020', current: false,
        bullets: [
          'Covered the banking beat through two major policy cycles.',
          'Filed daily market wraps and weekly feature pieces on corporate strategy.',
        ] },
      { id: 'i-e3', visible: true, position: 'Junior Reporter', company: 'Meridian Business Standard', location: 'Delhi', startDate: '2014', endDate: '2017', current: false,
        bullets: [
          'Covered local business news and company earnings during initial three year tenure.',
        ] },
    ] },
    { id: 's-edu', title: 'Education', visible: true, type: 'education', items: [
      { id: 'i-edu1', visible: true, degree: 'M.A., Journalism', institution: 'Asian College of Journalism', location: 'Chennai', startDate: '2012', endDate: '2014', grade: '', bullets: [] },
      { id: 'i-edu2', visible: true, degree: 'B.A., Economics', institution: 'Lady Shri Ram College', location: 'Delhi', startDate: '2009', endDate: '2012', grade: '', bullets: [] },
    ] },
    { id: 's-skill', title: 'Skills', visible: true, type: 'skills', layout: 'inline', marker: 'bullet', columns: 2, items: [
      { id: 'i-sk1', visible: true, category: 'Reporting', skills: ['Investigative reporting', 'Financial analysis', 'Source development', 'On camera commentary'] },
      { id: 'i-sk2', visible: true, category: 'Tools', skills: ['Bloomberg Terminal', 'CMS and WordPress'] },
    ] },
  ],
  settings: NO_PHOTO,
}

// =============================================================================
// 18. two-col - HR Manager
// =============================================================================
const HR_MANAGER: ResumeDocument = {
  basics: {
    fullName: 'Ritu Chawla', headline: 'HR Manager',
    email: 'ritu.chawla@example.com', phone: '+91 98150 44320', location: 'Noida, India',
    website: '', photoUrl: '', summary: '',
    links: [{ id: 'l1', label: 'LinkedIn', url: 'linkedin.com/in/ritu-chawla' }],
  },
  sections: [
    { id: 's-sum', title: 'Summary', visible: true, type: 'summary', items: [{ id: 'i-sum', visible: true,
      summary: 'HR manager with nine years spanning talent acquisition, employee relations, and HR operations for a 400 person technology company. Built the organization\'s first structured performance review process and has a track record of turning HR from a support function into a strategic partner.' }] },
    { id: 's-exp', title: 'Work Experience', visible: true, type: 'experience', items: [
      { id: 'i-e1', visible: true, position: 'HR Manager', company: 'Brightline Software', location: 'Noida', startDate: '2021', endDate: '', current: true,
        bullets: [
          'Own end to end HR for 400 employees across three offices.',
          'Cut average time to hire from 52 to 29 days by redesigning the interview pipeline.',
          'Built the company\'s first structured performance review cycle, now used organization wide.',
          'Led the rollout of a new HRIS system that consolidated four separate tools into one.',
          'Reduced voluntary attrition from 22% to 14% through a redesigned onboarding and manager training program.',
        ] },
      { id: 'i-e2', visible: true, position: 'HR Business Partner', company: 'Ferrous Consulting', location: 'Delhi', startDate: '2018', endDate: '2021', current: false,
        bullets: [
          'Managed employee relations for a 150 person engineering organization.',
          'Partnered with department heads on workforce planning for three annual budget cycles.',
        ] },
      { id: 'i-e3', visible: true, position: 'HR Generalist', company: 'Ferrous Consulting', location: 'Delhi', startDate: '2015', endDate: '2018', current: false,
        bullets: [
          'Handled recruitment coordination and onboarding for a 60 person office during a period of rapid hiring.',
        ] },
    ] },
    { id: 's-edu', title: 'Education', visible: true, type: 'education', items: [
      { id: 'i-edu1', visible: true, degree: 'MBA, Human Resources', institution: 'Tata Institute of Social Sciences', location: 'Mumbai', startDate: '2013', endDate: '2015', grade: '', bullets: [] },
    ] },
    { id: 's-skill', title: 'Skills', visible: true, type: 'skills', layout: 'inline', marker: 'bullet', columns: 2, items: [
      { id: 'i-sk1', visible: true, category: 'HR', skills: ['Talent acquisition', 'Performance management', 'Employee relations', 'Workforce planning'] },
      { id: 'i-sk2', visible: true, category: 'Systems', skills: ['Workday', 'BambooHR', 'Greenhouse'] },
    ] },
    { id: 's-cert', title: 'Certifications', visible: true, type: 'certifications', items: [
      { id: 'i-c1', visible: true, name: 'SHRM Certified Professional', issuer: 'SHRM', date: '2022', url: '' },
    ] },
  ],
  settings: NO_PHOTO,
}

// =============================================================================
// 19. sidebar - Customer Success Manager
// =============================================================================
const CS_MANAGER: ResumeDocument = {
  basics: {
    fullName: 'Tanvi Joshi', headline: 'Customer Success Manager',
    email: 'tanvi.joshi@example.com', phone: '+91 96860 77234', location: 'Pune, India',
    website: '', photoUrl: PHOTOS[2], summary: '',
    links: [{ id: 'l1', label: 'LinkedIn', url: 'linkedin.com/in/tanvijoshi' }],
  },
  sections: [
    { id: 's-sum', title: 'Summary', visible: true, type: 'summary', items: [{ id: 'i-sum', visible: true,
      summary: 'Customer success manager with seven years driving retention and expansion for mid market SaaS accounts. Owns a 3 million dollar book of business with a 96% net retention rate. Built the onboarding playbook her whole team now runs on.' }] },
    { id: 's-exp', title: 'Work Experience', visible: true, type: 'experience', items: [
      { id: 'i-e1', visible: true, position: 'Customer Success Manager', company: 'Meridian Cloud', location: 'Pune', startDate: '2021', endDate: '', current: true,
        bullets: [
          'Manage a 3 million dollar portfolio of 45 mid market accounts at 96% net retention.',
          'Built the onboarding playbook now used across the entire customer success organization.',
          'Identified and closed 400,000 dollars in expansion revenue over the past year.',
          'Reduced average support escalation time from three days to same day for key accounts.',
        ] },
      { id: 'i-e2', visible: true, position: 'Associate CSM', company: 'Foxglove SaaS', location: 'Bengaluru', startDate: '2019', endDate: '2021', current: false,
        bullets: [
          'Reduced average time to value from 60 to 21 days for new customers.',
          'Managed a book of 30 small business accounts with a 91% renewal rate.',
        ] },
      { id: 'i-e3', visible: true, position: 'Customer Support Specialist', company: 'Foxglove SaaS', location: 'Bengaluru', startDate: '2017', endDate: '2019', current: false,
        bullets: [
          'Resolved an average of 40 support tickets per week with a 95% satisfaction rating.',
        ] },
    ] },
    { id: 's-edu', title: 'Education', visible: true, type: 'education', items: [
      { id: 'i-edu1', visible: true, degree: 'B.B.A.', institution: 'Symbiosis Centre for Management Studies', location: 'Pune', startDate: '2013', endDate: '2017', grade: '', bullets: [] },
    ] },
    { id: 's-skill', title: 'Skills', visible: true, type: 'skills', layout: 'inline', marker: 'bullet', columns: 1, items: [
      { id: 'i-sk1', visible: true, category: '', skills: ['Account management', 'Renewals and upsell', 'Onboarding design', 'Cross functional collaboration', 'Customer advocacy'] },
    ] },
    { id: 's-lang', title: 'Languages', visible: true, type: 'languages', items: [
      { id: 'i-ln1', visible: true, name: 'English', proficiency: 'Fluent' },
      { id: 'i-ln2', visible: true, name: 'Marathi', proficiency: 'Native' },
    ] },
  ],
  settings: DEFAULT_SETTINGS,
}

// =============================================================================
// Mapping, one persona per template
// =============================================================================
const VARIANT_BY_TEMPLATE: Record<TemplateId, ResumeDocument> = {
  'ats-classic': MARKETING_MANAGER,
  'ats-modern': DATA_ANALYST,
  'classic-pro': CONSULTANT_CLASSIC,
  'modern-min': PRODUCT_MANAGER,
  executive: VP_OPERATIONS,
  compact: SALES_DIRECTOR,
  creative: DESIGNER,
  devtech: ENGINEER,
  academic: ACADEMIC,
  timeline: PROJECT_MANAGER,
  'photo-pro': REGISTERED_NURSE,
  'portal-pro': CONSULTANT_PORTAL,
  'modern-deep': UX_DESIGNER,
  'serif-ats': ATTORNEY,
  jake: JAKE_REFERENCE,
  banner: CONTENT_LEAD,
  editorial: JOURNALIST,
  'two-col': HR_MANAGER,
  sidebar: CS_MANAGER,
}

export function demoDocument(template: TemplateId): ResumeDocument {
  const persona = VARIANT_BY_TEMPLATE[template] ?? ENGINEER
  return {
    ...persona,
    settings: {
      ...persona.settings,
      ...applyTemplatePreset(template),
    },
  }
}