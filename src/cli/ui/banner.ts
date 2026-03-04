import pc from 'picocolors'

const BANNER = `
██████╗  ██████╗  ██████╗███╗   ███╗ ██████╗██████╗
██╔══██╗██╔═══██╗██╔════╝████╗ ████║██╔════╝██╔══██╗
██║  ██║██║   ██║██║     ██╔████╔██║██║     ██████╔╝
██║  ██║██║   ██║██║     ██║╚██╔╝██║██║     ██╔═══╝
██████╔╝╚██████╔╝╚██████╗██║ ╚═╝ ██║╚██████╗██║
╚═════╝  ╚═════╝  ╚═════╝╚═╝     ╚═╝ ╚═════╝╚═╝
`

export function printBanner(): void {
  console.log(pc.cyan(BANNER))
  console.log(pc.dim('  Index any documentation. Search it from your AI tools.'))
  console.log(pc.dim('  v0.1.0'))
  console.log()
}
