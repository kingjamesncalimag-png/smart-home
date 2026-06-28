FROM php:8.2-apache

# Enable PDO MySQL
RUN docker-php-ext-install pdo pdo_mysql

# Copy all files to Apache web root
COPY . /var/www/html/

# Apache listens on PORT env var
RUN echo "Listen \${PORT}" > /etc/apache2/ports.conf \
 && sed -i 's/VirtualHost \*:80/VirtualHost *:${PORT}/' /etc/apache2/sites-enabled/000-default.conf

EXPOSE ${PORT}

CMD ["apache2-foreground"]
