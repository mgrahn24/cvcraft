import { createGroq } from '@ai-sdk/groq';

const DEFAULT_MODEL = 'moonshotai/kimi-k2-instruct';

export const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

function model(envVar: string | undefined) {
  return groq(envVar ?? process.env.GROQ_MODEL ?? DEFAULT_MODEL);
}

export const models = {
  generate: model(process.env.GROQ_MODEL_GENERATE),
  update:   model(process.env.GROQ_MODEL_UPDATE),
  refine:   model(process.env.GROQ_MODEL_REFINE),
  add:      model(process.env.GROQ_MODEL_ADD),
  suggest:  model(process.env.GROQ_MODEL_SUGGEST),
  agent:    model(process.env.GROQ_MODEL_AGENT),
  profileExtract: model(process.env.GROQ_MODEL_PROFILE_EXTRACT ?? process.env.GROQ_MODEL_GENERATE),
  profileBuilderTurn: model(process.env.GROQ_MODEL_PROFILE_BUILDER_TURN ?? process.env.GROQ_MODEL_AGENT),
};
