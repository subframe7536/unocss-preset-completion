// @ts-expect-error fxxk
export default function Test(_props: Props): any {
  // @ts-expect-error fxxk
  return <div class="" />
}
// @ts-expect-error fxxk
export default function Icon(props: Props): any {
  // @ts-expect-error fxxk
  return <div class={cls(`i-${props.name} text-red `, props.solid && 't', props.class)} title={props.title || props.name} />
}
// @ts-expect-error fxxk
export default function Test1(props: Props): any {
  // @ts-expect-error fxxk
  return <div class={cls('', a ? (b > 0 ? 'foo' : 'bar') : 'baz', props.class)} />
}
