/**
 * Inserts a demo consultant + opportunity for testing.
 * Run with: npx tsx scripts/seed-demo.ts
 */
import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { db } from '../lib/db';
import { consultants, profileSections, opportunities } from '../lib/db/schema';

async function main() {
  const consultantId = 'demo-consultant-1';
  const opportunityId = 'demo-opportunity-1';

  // Consultant
  await db.insert(consultants).values({
    id: consultantId,
    name: 'Alex Lindqvist',
    headline: 'Senior Software Engineer',
    email: 'alex.lindqvist@example.com',
    phone: '+46 70 123 45 67',
    location: 'Stockholm, Sweden',
    summary: 'Full-stack engineer with 8 years of experience building scalable web applications. Specialises in TypeScript, React, and cloud-native architectures. Led cross-functional teams and delivered products used by millions.',
  }).onConflictDoNothing();

  // Profile sections
  await db.insert(profileSections).values([
    {
      id: 'demo-exp-1',
      consultantId,
      type: 'experience',
      order: 0,
      entries: [
        {
          id: 'exp-1',
          title: 'Senior Software Engineer',
          organisation: 'Klarna',
          location: 'Stockholm, Sweden',
          startDate: '2021-03',
          endDate: undefined,
          description: 'Lead engineer on the checkout SDK team. Rebuilt the core payment flow in React, reducing drop-off by 18%. Mentored 4 junior engineers and introduced TypeScript across the team.',
          skills: ['TypeScript', 'React', 'Node.js', 'Kafka', 'AWS'],
        },
        {
          id: 'exp-2',
          title: 'Software Engineer',
          organisation: 'Spotify',
          location: 'Stockholm, Sweden',
          startDate: '2018-06',
          endDate: '2021-02',
          description: 'Worked on the creator tools platform. Built features for podcast analytics and episode scheduling used by 10,000+ creators. Contributed to the internal design system.',
          skills: ['Python', 'React', 'GraphQL', 'GCP'],
        },
        {
          id: 'exp-3',
          title: 'Junior Developer',
          organisation: 'Tretton37',
          location: 'Malmö, Sweden',
          startDate: '2016-09',
          endDate: '2018-05',
          description: 'Consultant developer on several client projects including e-commerce and internal tooling for enterprise clients.',
          skills: ['JavaScript', 'C#', '.NET', 'Azure'],
        },
      ],
    },
    {
      id: 'demo-edu-1',
      consultantId,
      type: 'education',
      order: 1,
      entries: [
        {
          id: 'edu-1',
          title: 'MSc Computer Science',
          organisation: 'KTH Royal Institute of Technology',
          location: 'Stockholm, Sweden',
          startDate: '2014-09',
          endDate: '2016-06',
          description: 'Focus on distributed systems and machine learning.',
        },
        {
          id: 'edu-2',
          title: 'BSc Computer Science',
          organisation: 'Lund University',
          location: 'Lund, Sweden',
          startDate: '2011-09',
          endDate: '2014-06',
        },
      ],
    },
    {
      id: 'demo-skills-1',
      consultantId,
      type: 'skills',
      order: 2,
      entries: [
        {
          id: 'skills-1',
          skills: ['TypeScript', 'JavaScript', 'Python', 'React', 'Next.js', 'Node.js', 'GraphQL', 'REST APIs', 'PostgreSQL', 'Redis', 'AWS', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Git', 'Agile / Scrum'],
        },
      ],
    },
    {
      id: 'demo-lang-1',
      consultantId,
      type: 'languages',
      order: 3,
      entries: [
        { id: 'lang-1', title: 'Swedish', level: 'Native' },
        { id: 'lang-2', title: 'English', level: 'Fluent' },
        { id: 'lang-3', title: 'German', level: 'Conversational' },
      ],
    },
  ]).onConflictDoNothing();

  // Opportunity
  await db.insert(opportunities).values({
    id: opportunityId,
    clientName: 'FinTech Ventures AB',
    roleTitle: 'Lead Frontend Engineer',
    description: 'FinTech Ventures is building the next generation of open banking infrastructure. We are looking for a Lead Frontend Engineer to own the customer-facing dashboard and developer portal. You will work closely with the CTO and product team to define the technical direction.',
    requirements: `- 5+ years of experience with React and TypeScript
- Experience with financial or regulated products is a plus
- Strong understanding of web performance and accessibility
- Experience leading small engineering teams
- Familiarity with design systems and component libraries
- Bonus: experience with WebSockets or real-time data`,
    deadline: '2025-04-30',
  }).onConflictDoNothing();

  console.log('Demo data seeded:');
  console.log(`  Consultant: ${consultantId} (Alex Lindqvist)`);
  console.log(`  Opportunity: ${opportunityId} (Lead Frontend Engineer @ FinTech Ventures AB)`);
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
