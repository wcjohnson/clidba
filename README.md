# clidba

`clidba` is a tool for performing database administration tasks as part of a DevOps/GitOps workflow. It attempts to connect to a database using injected admin credentials and execute a series of instructions given by a json configuration file.

Typically one might use this to create required databases and users with restricted privileges, and in combination with other GitOps tools, this can yield completely automated credential/secret handling for databases.

## Examples

In a Kubernetes continuous deployment scenario, after spinning up a MySQL cluster, automatically create a user with credentials pulled from external secrets:

```yaml
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: clidba-conf
  namespace: mysql
data:
  conf.json: |
    {
      "driver": "mysql",
      "config": {
        "host": {
          "type": "env",
          "env": "MYSQL_HOST"
        },
        "port": {
          "type": "env",
          "env": "MYSQL_PORT"
        },
        "user": {
          "type": "env",
          "env": "MYSQL_ROOT_USER"
        },
        "password": {
          "type": "env",
          "env": "MYSQL_ROOT_PASSWORD"
        }
      },
      "instructions": [
        {
          "operation": "createUser",
          "name": {
            "type": "env",
            "env": "MYSQL_USERNAME"
          },
          "password": {
            "type": "env",
            "env": "MYSQL_PASSWORD"
          },
          "grantAll": true
        }
      ]
    }
---
apiVersion: batch/v1
kind: Job
metadata:
  name: clidba-job
  namespace: mysql
spec:
  template:
    spec:
      containers:
      - name: security-bootstrap
        image: "ghcr.io/wcjohnson/clidba/clidba:latest"
        imagePullPolicy: Always
        volumeMounts:
          - mountPath: /clidba-conf
            name: clidba-conf
        env:
          - name: MYSQL_HOST
            value: "mysql.mysql.svc"
          - name: MYSQL_PORT
            value: "6446"
          - name: MYSQL_ROOT_USER
            valueFrom:
              secretKeyRef:
                name: mysql-root
                key: rootUser
          - name: MYSQL_ROOT_PASSWORD
            valueFrom:
              secretKeyRef:
                name: mysql-root
                key: rootPassword
          - name: MYSQL_USERNAME
            valueFrom:
              secretKeyRef:
                name: mysql-credentials
                key: MYSQL_USERNAME
          - name: MYSQL_PASSWORD
            valueFrom:
              secretKeyRef:
                name: mysql-credentials
                key: MYSQL_PASSWORD
      volumes:
        - name: clidba-conf
          configMap:
            name: clidba-conf
      restartPolicy: Never
  backoffLimit: 4
```