## Docker Compose example

> [!NOTE]
> In this example the Cloudbeaver docker container is attached to the docker network named "caddy-network" assuming that Caddy is attached to that network in its docker compose file. Change the network name accordingly if needed.

```
services:
  cloudbeaver:
    image: dbeaver/cloudbeaver
    container_name: cloudbeaver
    ports:
      - 8978:8978
    volumes:
      - cloudbeaver-workspace:/opt/cloudbeaver/workspace
      - /real/path/on/the/disk/to/bewegung.db:/config/bewegung.db
    networks:
      - caddy-network
    environment:
      CLOUDBEAVER_ROOT_URI: /cloudbeaver/

volumes:
  cloudbeaver-workspace:

networks:
  caddy-network:
    external: true
```

## Caddyfile example

```
your-server-name.duckdns.org {

        # Generate password storing hash with: caddy hash-password
        basic_auth {
                # Username "iib", password "bewegung"
                iib $2a$14$basROD3Y0cLE.VqXd.h89.akCQDKzhp6IH9ND2CRFyEICkMrKn3AO        
        }

        root /var/www/iib/

        reverse_proxy /cloudbeaver/* cloudbeaver:8978

}
```
