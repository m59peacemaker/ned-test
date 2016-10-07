#!/usr/bin/env node

const {spawn} = require('child_process')
const program = require('commander')
const {watch} = require('chokidar')
const debounce = require('debounce')
const {bold} = require('chalk')
const exclusiveProcess = require('exclusive-process')
const {sync: globAssist} = require('cli-glob-assist')
const {chainToProcess} = require('cp-pipe')

const args = program
  .arguments('[files...]', '[path to a directory containing tests to be run or globs of node files to run]')
  .option('-w, --watch [directory]', 'specify directory to watch unless same as directory being tested')
  .option('-p, --pretty')
  // .option('-m, --minimal', 'minimal output and exit on first failing test')
  .parse(process.argv)

const testFiles = globAssist(args.args, `**/*.{spec,test}.js`)

const tapeCommand = (files) => spawn(require.resolve('tape/bin/tape'), files)
const formatCommand = () => spawn(require.resolve('tap-spec/bin/cmd'), ['--colors'])
// const filterCommand = () => spawn(require.resolve('tap-filter/bin/cmd'), ['plan', 'test-fail'])
// const bailCommand = () => spawn(require.resolve('tap-bail/bin/cmd'))

const test = (files) => {
  console.log(bold('Running tests...'))
  const testProcess = tapeCommand(files)
  let processes = [testProcess]
  if (args.minimal) {
    //processes.push(filterCommand(), bailCommand())
  }
  if (args.pretty) {
    processes.push(formatCommand())
  }
  chainToProcess(processes)
  return testProcess
}
const exclusiveTest = exclusiveProcess(() => test(testFiles))

exclusiveTest()

const getWatchArg = () => {
  if (typeof args.watch === 'string' && args.watch.length) {
    return args.watch
  }
  if (args.files && args.files.length) {
    return testFiles
  }
  return process.cwd()
}

if (args.watch) {
  watch(getWatchArg(), {
    ignored: ['**/node_modules/**'],
    ignoreInitial: true
  }).on('all', debounce(exclusiveTest, 100))
}
