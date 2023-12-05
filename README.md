# lionweb-repository
Reference implementation of LionWeb repository

## Postgres
The database used for storage of models is Postgres, 
the easiest way to set up Postgres is through docker.

The Postgres version currently being used is: : postgres:16.1.
The `.env` file contains the user/database/port names and numbers being used.

plantuml::database-schema.puml[format=svg]

```plantuml 
@startuml
entity lionweb_nodes {
    * id <<KEY>>
    --
    * classifier
    * parent
}
entity lionweb_properties {
    * id <<key>>
    --
    * property: jsonb
    * value: text
    * node_id <FK>
}
entity lionweb_containments {
    * id <<key>>
    --
    * classifier: jsonb
    * children: text[]
    * node_id <FK>
}
entity lionweb_references {
    * id <<key>>
    --
    * reference: jsonb
    * targets: text[]
    * node_id <FK>
}
lionweb_nodes  ||--o{ lionweb_properties
lionweb_nodes  ||--o{ lionweb_containments
lionweb_nodes  ||--o{ lionweb_references
@enduml
```

## 

