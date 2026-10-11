#!/bin/bash

if [ "${#MONGO_APP_PASSWORD}" -lt 64 ]; then
    echo "MONGO_APP_PASSWORD must contain at least 64 hexadecimal characters." >&2
    exit 1
fi

case "$MONGO_APP_PASSWORD" in
    *[!0123456789abcdefABCDEF]*)
        echo "MONGO_APP_PASSWORD must contain only hexadecimal characters." >&2
        exit 1
        ;;
esac

mongosh --quiet --eval "db.getSiblingDB('admin').createUser({user: 'nottex_app', pwd: '$MONGO_APP_PASSWORD', roles: [{role: 'readWrite', db: 'users'}, {role: 'readWrite', db: 'notes'}]})"
