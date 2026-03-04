import pc from 'picocolors'

export const styles = {
  title: (text: string) => pc.bold(pc.cyan(text)),
  success: (text: string) => pc.green(text),
  error: (text: string) => pc.red(text),
  warning: (text: string) => pc.yellow(text),
  dim: (text: string) => pc.dim(text),
  highlight: (text: string) => pc.bold(pc.white(text)),
  url: (text: string) => pc.underline(pc.blue(text)),
  code: (text: string) => pc.cyan(text),
  number: (text: string | number) => pc.yellow(String(text)),
}

export const icons = {
  success: pc.green('✓'),
  error: pc.red('✗'),
  warning: pc.yellow('!'),
  info: pc.blue('ℹ'),
  pending: pc.dim('○'),
  active: pc.cyan('●'),
}
