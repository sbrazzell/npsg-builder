export type AnalyzerProvider = 'rules' | 'anthropic' | 'openai'

export function getAnalyzerProvider(): AnalyzerProvider {
  const val = process.env.ANALYZER_PROVIDER ?? 'rules'
  if (val === 'anthropic' || val === 'openai') return val
  return 'rules'
}
