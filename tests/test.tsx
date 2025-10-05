interface Props {
  name: string
  class: string
}
export function Test(_props: Props): any {
  return <div className="" />
}
export function Icon(props: Props): any {
  return (
    <div
      className={cls(`i-${props.name} text-red`, props.name && '', props.class)}
      title={props.name}
    />
  )
}

export function Test1(props: Props): any {
  return <div className={cls(`accent-amber`, 1 ? (2 > 0 ? 'flex' : 'flex-col') : 'transition-all', props.class)} />
}

export function Test2(props: Props): any {
  return (
    <div
      className={cls(
        'pointer-events-none b-(1 solid #555) block size-5 translate-x-0 rounded-full shadow-lg ring-0 transition-transform data-[checked]:translate-x-5',
        props.class,
      )}
    />
  )
}

export const buttonCls = cls(
  'fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[closed]:(duration-300 animate-out) data-[expanded]:(duration-500 animate-in) [&:focus-visible+div]:(outline-none ring-(1.5 ring offset-(2 background)))',
)

export function Test3(props: Props): any {
  return (
    <div
      className={cls('accent-amber', {
        variant: {
          size: {
            small: `text-black/40 ${props.class}`,
          },
        },
      })}
    />
  )
}

function cls(...args: any): string {
  return args
}
