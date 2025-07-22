// @ts-expect-error fxxk
export default function Icon(props: Props): any {
  // @ts-expect-error fxxk
  return <div class={cls(`i-${props.name} text-red`, props.class)} title={props.title || props.name} />
}
