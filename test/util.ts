export function timer(ms: number) {
    return new Promise(ok => setTimeout(ok, ms))
}