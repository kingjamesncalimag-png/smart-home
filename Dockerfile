FROM php:8.2-apache
 
RUN docker-php-ext-install pdo pdo_mysql
 
RUN a2dismod mpm_event && a2enmod mpm_prefork rewrite
 
COPY . /var/www/html/
 
RUN echo "ServerName localhost" >> /etc/apache2/apache2.conf \
    && sed -i 's/Listen 80/Listen ${PORT:-80}/' /etc/apache2/ports.conf \
    && sed -i 's/<VirtualHost \*:80>/<VirtualHost *:${PORT:-80}>/' /etc/apache2/sites-enabled/000-default.conf
 
CMD ["apache2-foreground"]
