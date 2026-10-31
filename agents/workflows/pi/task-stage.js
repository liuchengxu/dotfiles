if (!args || !['implement', 'review'].includes(args.stage)) throw new Error('Expected one parent-validated stage');
if (args.stage === 'review') throw new Error('Future reviews require the approved DeepSeek closed-source adapter; native reviewer dispatch is disabled');
if (['authority', 'source', 'task', 'profile'].some(key => typeof args[key] !== 'string' || !args[key].trim())) throw new Error('Incomplete handoff');
const agent = args.stage === 'implement' ? 'task-implementer' : 'task-reviewer';
const task = `Parent-supplied authority and scope:\n${args.authority}\n\nSource identity:\n${args.source}\n\nTask:\n${args.task}`;
return await runs.run('task-stage', {agent, task, model: args.profile, context: 'fresh', output: false});
