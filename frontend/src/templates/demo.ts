/**
 * The sample resume shown in the creation dialog.
 *
 * Every template card renders the same document through the same ResumePage
 * the editor uses -- only the composition differs -- so what a person picks is
 * exactly what they will get. The content is calibrated to fill one A4 sheet
 * well in every design: enough substance to show how a template handles real
 * density, never so much that the preview spills onto a second page -- a
 * template that ships with an accidental page two looks broken on arrival.
 */

import type { ResumeDocument, TemplateId } from '../types'
import { TEMPLATES_BY_ID } from './registry'

const BASE: ResumeDocument = {
  basics: {
    fullName: 'Ananya Rao',
    headline: 'Senior Product Engineer',
    email: 'ananya.rao@example.com',
    phone: '+91 98450 11223',
    location: 'Bengaluru, India',
    website: 'ananyarao.dev',
    photoUrl: '/demo-avatar.svg',
    summary: '',
    links: [
      { id: 'l1', label: 'LinkedIn', url: 'https://linkedin.com/in/ananyarao' },
      { id: 'l2', label: 'GitHub', url: 'https://github.com/ananyarao' },
    ],
  },
  sections: [
    {
      id: 's-sum',
      title: 'Summary',
      visible: true,
      type: 'summary',
      items: [
        {
          id: 'i-sum',
          visible: true,
          summary:
            'Product engineer with eight years across platform teams and zero-to-one products. Equally at home in a design review and a Postgres query plan, with systems in production serving forty million monthly users.',
        },
      ],
    },
    {
      id: 's-exp',
      title: 'Work Experience',
      visible: true,
      type: 'experience',
      items: [
        {
          id: 'i-exp1',
          visible: true,
          position: 'Senior Product Engineer',
          company: 'Northwind Labs',
          location: 'Bengaluru',
          startDate: '2021',
          endDate: '',
          current: true,
          bullets: [
            'Own the checkout platform -- 40M monthly users, ₹900Cr annualised volume -- and lead a team of four.',
            'Cut p95 checkout latency from 2.9s to 780ms by reworking the pricing service and removing three round trips.',
            'Drove a token-driven design system across 400 screens; UI defects down 38% within two quarters.',
          ],
        },
        {
          id: 'i-exp2',
          visible: true,
          position: 'Product Engineer',
          company: 'Cobalt Systems',
          location: 'Kochi',
          startDate: '2018',
          endDate: '2021',
          current: false,
          bullets: [
            'Built the analytics workspace that became the company\'s most-used surface, ahead of features twice as old.',
            'Introduced contract tests between frontend and billing, ending a recurring class of month-end incidents.',
          ],
        },
        {
          id: 'i-exp3',
          visible: true,
          position: 'Software Engineer',
          company: 'Fernpath',
          location: 'Remote',
          startDate: '2016',
          endDate: '2018',
          current: false,
          bullets: [
            'First engineering hire; took the MVP from prototype to paying customers in nine months.',
          ],
        },
      ],
    },
    {
      id: 's-proj',
      title: 'Projects',
      visible: true,
      type: 'projects',
      items: [
        {
          id: 'i-prj1',
          visible: true,
          name: 'ledgerline',
          role: 'Open source · maintainer',
          url: 'github.com/ananyarao/ledgerline',
          startDate: '2022',
          endDate: '',
          bullets: [
            'Double-entry ledger library for TypeScript; 2.1k stars, used in production by three fintechs.',
          ],
        },
        {
          id: 'i-prj2',
          visible: true,
          name: 'Fieldnotes',
          role: 'Side project',
          url: 'fieldnotes.app',
          startDate: '2020',
          endDate: '',
          bullets: ['Offline-first research notebook; CRDT sync under the hood, 4k weekly researchers.'],
        },
      ],
    },
    {
      id: 's-edu',
      title: 'Education',
      visible: true,
      type: 'education',
      items: [
        {
          id: 'i-edu1',
          visible: true,
          degree: 'M.Tech, Computer Science',
          institution: 'IIT Madras',
          location: 'Chennai',
          startDate: '2014',
          endDate: '2016',
          grade: '9.1 CGPA',
          bullets: [],
        },
        {
          id: 'i-edu2',
          visible: true,
          degree: 'B.E., Information Technology',
          institution: 'NIT Surathkal',
          location: 'Mangaluru',
          startDate: '2010',
          endDate: '2014',
          grade: '',
          bullets: [],
        },
      ],
    },
    {
      id: 's-skill',
      title: 'Skills',
      visible: true,
      type: 'skills',
      layout: 'inline',
      marker: 'bullet',
      columns: 2,
      items: [
        {
          id: 'i-sk1',
          visible: true,
          category: 'Languages',
          skills: ['TypeScript', 'Go', 'Python', 'SQL'],
        },
        {
          id: 'i-sk2',
          visible: true,
          category: 'Frontend',
          skills: ['React', 'Next.js', 'Design systems', 'Accessibility'],
        },
        {
          id: 'i-sk3',
          visible: true,
          category: 'Backend & data',
          skills: ['Postgres', 'Redis', 'Event streaming', 'gRPC'],
        },
        {
          id: 'i-sk4',
          visible: true,
          category: 'Practice',
          skills: ['Incident command', 'A/B experimentation', 'Tech writing'],
        },
      ],
    },
    {
      id: 's-cert',
      title: 'Certifications',
      visible: true,
      type: 'certifications',
      items: [
        { id: 'i-ct1', visible: true, name: 'AWS Solutions Architect – Professional', issuer: 'Amazon Web Services', date: '2023', url: '' },
        { id: 'i-ct2', visible: true, name: 'CKA – Certified Kubernetes Administrator', issuer: 'CNCF', date: '2021', url: '' },
      ],
    },
    {
      id: 's-lang',
      title: 'Languages',
      visible: true,
      type: 'languages',
      items: [
        { id: 'i-ln1', visible: true, name: 'English', proficiency: 'Fluent' },
        { id: 'i-ln2', visible: true, name: 'Hindi', proficiency: 'Native' },
      ],
    },
  ],
  settings: {
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
    columnLayout: 'one',
    headerPosition: 'top',
    columnWidth: 40,
    leftColumn: [],
    rightColumn: [],
    photoLayout: {
      show: true,
      grayscale: false,
      position: 'left',
      size: 24,
      shape: 'circle',
      focusX: 50,
      focusY: 50,
      zoom: 1,
    },
    headingStyle: {
      visual: 'underline',
      capitalization: 'uppercase',
      showIcons: true,
      iconStyle: 'filled',
    },
  },
}

/** The sample wearing one specific design. The document is never mutated --
    only rendered -- so sharing section references across cards is safe. */
export function demoDocument(template: TemplateId): ResumeDocument {
  const font = TEMPLATES_BY_ID.get(template)?.font
  return {
    ...BASE,
    settings: {
      ...BASE.settings,
      template,
      ...(font ? { fontFamily: font } : {}),
    },
  }
}
