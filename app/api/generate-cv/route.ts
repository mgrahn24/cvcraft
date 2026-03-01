import { generateObject } from 'ai';
import { models } from '@/lib/ai/models';
import { cvGenerationSchema } from '@/lib/ai/schemas';
import { CV_GENERATION_SYSTEM_PROMPT, CV_GENERATION_USER_PROMPT } from '@/lib/ai/prompts';
import { db } from '@/lib/db';
import { consultants, profileSections, opportunities, cvTemplates, rulesets, cvVersions, consultantGuidance } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import type { Component, Theme, ProfileSection } from '@/types';

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      opportunityId: string;
      consultantId: string;
      templateId: string;
      rulesetIds?: string[];
      consultantGuidance?: string;
    };

    const { opportunityId, consultantId, templateId } = body;
    if (!opportunityId || !consultantId || !templateId) {
      return new Response('Missing required fields', { status: 400 });
    }

    // Load all required data in parallel
    const [
      [consultant],
      sections,
      [opportunity],
      [template],
      guidanceRows,
    ] = await Promise.all([
      db.select().from(consultants).where(eq(consultants.id, consultantId)),
      db.select().from(profileSections)
        .where(eq(profileSections.consultantId, consultantId))
        .orderBy(profileSections.order),
      db.select().from(opportunities).where(eq(opportunities.id, opportunityId)),
      db.select().from(cvTemplates).where(eq(cvTemplates.id, templateId)),
      db.select().from(consultantGuidance)
        .where(and(
          eq(consultantGuidance.opportunityId, opportunityId),
          eq(consultantGuidance.consultantId, consultantId)
        )).limit(1),
    ]);

    if (!consultant || !opportunity || !template) {
      return new Response('Resource not found', { status: 404 });
    }

    // Load rulesets if specified
    let rulesetRules: string[] = [];
    if (body.rulesetIds?.length) {
      const rulesetRows = await db.select().from(rulesets)
        .where(inArray(rulesets.id, body.rulesetIds));
      rulesetRules = rulesetRows.flatMap((r) => r.rules as string[]);
    }

    const templateComponents = template.components as Component[];
    const templateHtml = templateComponents.map((c) => c.html).join('\n');
    const templateTheme = (template.theme as Theme | null) ?? { daisyTheme: 'light', fontFamily: 'Inter' };

    const guidance = body.consultantGuidance || guidanceRows[0]?.guidance;

    const { object } = await generateObject({
      model: models.generate,
      schema: cvGenerationSchema,
      system: CV_GENERATION_SYSTEM_PROMPT,
      prompt: CV_GENERATION_USER_PROMPT({
        consultant: {
          name: consultant.name,
          headline: consultant.headline ?? undefined,
          email: consultant.email ?? undefined,
          phone: consultant.phone ?? undefined,
          location: consultant.location ?? undefined,
          summary: consultant.summary ?? undefined,
          sections: sections.map((s) => ({
            type: s.type,
            entries: s.entries as unknown[],
          })),
        },
        opportunity: {
          clientName: opportunity.clientName,
          roleTitle: opportunity.roleTitle,
          description: opportunity.description,
          requirements: opportunity.requirements ?? undefined,
        },
        templateHtml,
        rulesets: rulesetRules,
        consultantGuidance: guidance,
      }),
    });

    // Build canvas-compatible components
    const components: Component[] = object.components.map((c, i) => ({
      id: c.id,
      type: 'custom' as const,
      label: c.label,
      html: c.html,
      order: i,
    }));

    const theme: Theme = {
      daisyTheme: (object.daisyTheme as Theme['daisyTheme']) ?? templateTheme.daisyTheme,
      fontFamily: (object.fontFamily as Theme['fontFamily']) ?? templateTheme.fontFamily,
    };

    // Save as CV version
    const versionId = crypto.randomUUID();
    await db.insert(cvVersions).values({
      id: versionId,
      consultantId,
      templateId,
      opportunityId,
      rulesetIds: body.rulesetIds ?? [],
      components,
      theme,
    });

    return Response.json({ id: versionId });
  } catch (err) {
    console.error('[generate-cv]', err);
    return new Response(String(err), { status: 500 });
  }
}
