import { useState } from "react"
import { toast } from "sonner"

type AsyncAction<TArgs extends unknown[], TResult> = (...args: TArgs) => Promise<TResult>;

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "An unexpected error occurred";
}

const useFetch = <TArgs extends unknown[], TResult>(
    cb: AsyncAction<TArgs, TResult>,
) =>{
    const [data,setData] = useState<TResult | undefined>(undefined)
    const[loading,setLoading] = useState<boolean|null>(null)
    const [error,setError] = useState<string|null>(null);

    const fn = async (...args: TArgs): Promise<void> =>{
        setLoading(true); 
        setError(null);

        try {
            const response: TResult = await cb(...args);
            setData(response);
            setError(null); 
        } catch (error) {
            const message = getErrorMessage(error);
            setError(message);
            toast.error(message);
        }finally{
            setLoading(false); 
        }
    }

    return {data,loading,error,fn,setData}; 
}

export default useFetch;