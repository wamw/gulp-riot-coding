require('./components/todo.tag');

riot.mount('todo', {
  title: 'I want to behave!',
  items: [
    { title: 'Avoid excessive caffeine', done: true },
    { title: 'Hidden item', hidden: true },
    { title: 'Be less provocative' },
    { title: 'Be nice to people' },
    { title: 'Be nice to people' }
  ]
});