export function timer(ms: number): Promise<number> {
    return new Promise<number>((ok) => setTimeout(ok, ms))
}
