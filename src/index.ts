import { watchEffect, customRef, Ref } from "vue-demi"

export type CleanupFunction = () => void
export type SetCleanupFunction = (cf: CleanupFunction) => void

export function useSwitchMap<T>(ref: Ref<T>, projectionFromValuesToRefs: (value: T, scf: SetCleanupFunction ) => Ref<T>) {

    // cleanup function on ref.value update
    let localCleanup: CleanupFunction = () => {}
    const refreshCleanup = (cleanup: CleanupFunction) => {
        if (typeof cleanup !== "function") {
            localCleanup = () => {}
        } else {
            localCleanup = cleanup
        }
    }

    let dependenciesTrigger: () => void = () => {}

    let projectedRef: null | Ref<T> = null;

    let localValue: T | null = null

    watchEffect(() => {
        // the projection may need the ability to cleanup some stuff
        localCleanup()
        projectedRef = projectionFromValuesToRefs(ref.value, refreshCleanup)

        // an update on ref.value will produce a new projectedRef
        // all the swicthMapRef dependencies should be notified
        dependenciesTrigger()
    })

    watchEffect(() => {
        localValue = projectedRef!.value;

        // projectedRef.value has changed, we've got a new value
        // so we must notify our dependencies
        dependenciesTrigger()
    })

    return customRef((track, trigger) => {

        dependenciesTrigger = trigger

        return {
            get() {
                track()
                return localValue!
            },
            // not so much sense on changing this customRef value
            // because it's value strictly depends on ref.value and projectedRef.valueu pdates
            // it will be overwritten as soon as ref.value / projectedRef.value changes
            set(value: T) {
                localValue = value
                dependenciesTrigger()
            }
        }

    })

}