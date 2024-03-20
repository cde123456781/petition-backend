type User = {
    id: number,
    email: string,
    first_name: string,
    last_name: string,
    image_filename: string,
    password: string,
    auth_token: string
}


type Petition = {
    id: number,
    title: string,
    description: string,
    creation_date: string,
    image_filename: string,
    owner_id: string,
    category_id: string
}


type Category = {
    id: number,
    name: string
}