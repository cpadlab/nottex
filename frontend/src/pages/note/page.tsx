import { useParams } from "react-router-dom"

interface RouteParams {
    id: string;
    [key: string]: string | undefined;
}

const NotePage = () => {

    const { id } = useParams<RouteParams>();
    
    return (
        <div>page</div>
    )
}

export default NotePage