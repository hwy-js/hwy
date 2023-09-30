import path from 'node:path'
import dotenv from 'dotenv'
import chokidar from 'chokidar'
import { IS_DEV, sinks } from './constants.js'
import { runBuildTasks } from './run-build-tasks.js'
import { hwy_log } from './hwy-log.js'

function devSetup(props?: { watchExclusions?: string[] }) {
  if (IS_DEV) {
    dotenv.config()

    function send_signal_to_sinks() {
      hwy_log(`Sending reload signal to browser...`)
      for (const sink of sinks) {
        sink.send_message('reload')
      }
    }

    const refresh_watcher = chokidar.watch(
      path.join(process.cwd(), '.dev/refresh.txt'),
      { ignoreInitial: true },
    )

    refresh_watcher.on('all', () => send_signal_to_sinks())

    const exclusions =
      props?.watchExclusions?.map((x) => path.join(process.cwd(), x)) ?? []

    const watcher = chokidar.watch(
      [path.join(process.cwd(), 'src'), path.join(process.cwd(), 'public')],
      {
        ignoreInitial: true,
        ignored: [path.join(process.cwd(), 'public/dist'), ...exclusions],
      },
    )

    watcher.on('all', async (_, path) => {
      await runBuildTasks('triggered from chokidar watcher: ' + path)
    })
  }
}

export { devSetup }
